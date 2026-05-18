import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { GenerateDto } from '../generator.interface';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class MsStrategy extends GeneratorStrategyBase {
  async generate(dir: string, name: string, dto: GenerateDto): Promise<void> {
    const src      = path.join(dir, 'src');
    const withLogs = dto.observability?.logs === true;
    const broker   = dto.kafkaBroker ?? 'localhost:9092';
    const topic    = dto.kafkaTopic  ?? 'platform.logs';

    fs.mkdirSync(path.join(src, 'config'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'uploads', '.gitkeep'), '');

    if (withLogs) this.writeKafkaLoggerModule(src, name, broker, topic);

    this.writeFilesController(src, withLogs);
    this.writeFilesService(src);
    this.writeMulterConfig(src);
    this.writeAppModule(src, name, withLogs);
    this.writeMain(src, name, dto.authType);
    this.writePackageJson(dir, name, dto, withLogs);
    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));
    fs.writeFileSync(path.join(dir, '.env'), this.buildEnvFile(name, dto, withLogs, broker, topic));
    fs.writeFileSync(path.join(dir, '.env.example'), this.buildEnvFile(name, dto, withLogs, broker, topic, true));
    fs.writeFileSync(path.join(dir, 'Dockerfile'), this.buildMediaDockerfile(name));
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\nuploads/*\n!uploads/.gitkeep\n');
    fs.writeFileSync(path.join(dir, 'docker-compose.yml'), this.buildDockerCompose(name));
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildMediaReadme(name, dto, withLogs));
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildMediaOpenApiSpec(name));
  }

  private writeFilesController(src: string, withLogs: boolean): void {
    const kafkaImports = withLogs
      ? `import { Req } from '@nestjs/common';\nimport type { Request } from 'express';\nimport { KafkaLoggerService } from './logger/kafka-logger.service';`
      : '';

    const kafkaConstructor = withLogs
      ? `  constructor(\n    private readonly filesService: FilesService,\n    private readonly kafkaLogger: KafkaLoggerService,\n  ) {}`
      : `  constructor(private readonly filesService: FilesService) {}`;

    const uploadMethod = withLogs ? `
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un archivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new NotFoundException('No se recibió ningún archivo');
    const result = this.filesService.saveMetadata(file);
    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'FILE_UPLOAD',
      action:    'upload-file',
      outcome:   'SUCCESS',
      message:   \`Archivo subido: \${file.originalname}\`,
      payload:   { id: result.id, filename: file.originalname, size: file.size, mimetype: file.mimetype },
    });
    return result;
  }` : `
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un archivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new NotFoundException('No se recibió ningún archivo');
    return this.filesService.saveMetadata(file);
  }`;

    const downloadMethod = withLogs ? `
  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar un archivo' })
  async download(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    const filePath = this.filesService.getFilePath(id);
    const meta     = this.filesService.findOne(id);
    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'FILE_DOWNLOAD',
      action:    'download-file',
      outcome:   'SUCCESS',
      message:   \`Archivo descargado: \${meta.originalName}\`,
      payload:   { id, filename: meta.originalName, mimetype: meta.mimetype, size: meta.size },
    });
    res.setHeader('Content-Disposition', \`attachment; filename="\${meta.originalName}"\`);
    res.setHeader('Content-Type', meta.mimetype);
    res.download(filePath, meta.originalName);
  }` : `
  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar un archivo' })
  download(@Param('id') id: string, @Res() res: Response) {
    const filePath = this.filesService.getFilePath(id);
    const meta     = this.filesService.findOne(id);
    res.setHeader('Content-Disposition', \`attachment; filename="\${meta.originalName}"\`);
    res.setHeader('Content-Type', meta.mimetype);
    res.download(filePath, meta.originalName);
  }`;

    const deleteMethod = withLogs ? `
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un archivo' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const meta = this.filesService.findOne(id);
    this.filesService.remove(id);
    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'FILE_DELETE',
      action:    'delete-file',
      outcome:   'SUCCESS',
      message:   \`Archivo eliminado: \${meta.originalName}\`,
      payload:   { id, filename: meta.originalName },
    });
  }` : `
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un archivo' })
  remove(@Param('id') id: string) {
    this.filesService.remove(id);
  }`;

    fs.writeFileSync(path.join(src, 'files.controller.ts'), `import {
  Controller, Get, Post, Delete, Param, Res,
  UploadedFile, UseInterceptors, HttpCode, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
${kafkaImports}
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
${kafkaConstructor}

  @Get()
  @ApiOperation({ summary: 'Listar todos los archivos' })
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener metadata de un archivo' })
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }
${uploadMethod}
${downloadMethod}
${deleteMethod}
}
`);
  }

  private writeFilesService(src: string): void {
    fs.writeFileSync(path.join(src, 'files.service.ts'), `import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface FileMetadata {
  id:           string;
  originalName: string;
  filename:     string;
  mimetype:     string;
  size:         number;
  path:         string;
  createdAt:    string;
}

@Injectable()
export class FilesService {
  private readonly store: FileMetadata[] = [];

  saveMetadata(file: Express.Multer.File): FileMetadata {
    const entry: FileMetadata = {
      id:           uuidv4(),
      originalName: file.originalname,
      filename:     file.filename,
      mimetype:     file.mimetype,
      size:         file.size,
      path:         file.path,
      createdAt:    new Date().toISOString(),
    };
    this.store.push(entry);
    return entry;
  }

  findAll(): FileMetadata[] {
    return this.store;
  }

  findOne(id: string): FileMetadata {
    const f = this.store.find(m => m.id === id);
    if (!f) throw new NotFoundException(\`Archivo \${id} no encontrado\`);
    return f;
  }

  getFilePath(id: string): string {
    return this.findOne(id).path;
  }

  remove(id: string): void {
    const f   = this.findOne(id);
    const idx = this.store.indexOf(f);
    if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    this.store.splice(idx, 1);
  }
}
`);
  }

  private writeMulterConfig(src: string): void {
    fs.writeFileSync(path.join(src, 'config', 'multer.config.ts'), `import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const ext    = path.extname(file.originalname);
      const unique = \`\${Date.now()}-\${Math.round(Math.random() * 1e9)}\${ext}\`;
      cb(null, unique);
    },
  }),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_MB ?? 50) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = (process.env.ALLOWED_TYPES ?? '').split(',').filter(Boolean);
    if (!allowed.length || allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(\`Tipo de archivo no permitido: \${file.mimetype}\`), false);
    }
  },
};
`);
  }

  private writeAppModule(src: string, name: string, withLogs: boolean): void {
    const kafkaImports = withLogs
      ? `\nimport { APP_INTERCEPTOR } from '@nestjs/core';\nimport { KafkaLoggerModule } from './logger/kafka-logger.module';\nimport { AuditInterceptor } from './logger/audit.interceptor';\nimport { KafkaLoggerService } from './logger/kafka-logger.service';`
      : '';
    const kafkaModuleLine    = withLogs ? `\n    KafkaLoggerModule,` : '';
    const kafkaProvidersLine = withLogs
      ? `\n  providers: [\n    FilesService,\n    KafkaLoggerService,\n    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },\n  ],`
      : `\n  providers: [FilesService],`;

    fs.writeFileSync(path.join(src, 'app.module.ts'), `// Media Service — ${name}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { multerConfig } from './config/multer.config';${kafkaImports}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MulterModule.register(multerConfig),${kafkaModuleLine}
  ],
  controllers: [FilesController],${kafkaProvidersLine}
})
export class AppModule {}
`);
  }

  private writeMain(src: string, name: string, authType?: string): void {
    const bearerLine = authType === 'jwt' ? '\n    .addBearerAuth()' : '';
    fs.writeFileSync(path.join(src, 'main.ts'), `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('${name}')
    .setDescription('Media Service — Generado por Jarvis Platform')
    .setVersion('1.0')${bearerLine}
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(\`Service: http://localhost:\${port}\`);
  console.log(\`Swagger: http://localhost:\${port}/api/docs\`);
}
bootstrap();
`);
  }

  private writePackageJson(dir: string, name: string, dto: GenerateDto, withLogs: boolean): void {
    const pkg: any = {
      name,
      version: '1.0.0',
      scripts: {
        start:       'node dist/main',
        build:       'tsc -p tsconfig.json',
        'start:dev': 'ts-node -r tsconfig-paths/register src/main.ts',
      },
      dependencies: {
        '@nestjs/common':           '^10.0.0',
        '@nestjs/core':             '^10.0.0',
        '@nestjs/config':           '^3.0.0',
        '@nestjs/platform-express': '^10.0.0',
        '@nestjs/swagger':          '^7.0.0',
        'multer':                   '^1.4.5-lts.1',
        'reflect-metadata':         '^0.1.13',
        'rxjs':                     '^7.8.0',
        'uuid':                     '^9.0.0',
      },
      devDependencies: {
        '@types/multer':  '^1.4.11',
        '@types/uuid':    '^9.0.0',
        'typescript':     '^5.0.0',
        'ts-node':        '^10.0.0',
        'tsconfig-paths': '^4.0.0',
      },
    };

    if (withLogs) pkg.dependencies['kafkajs'] = '^2.2.0';
    if (dto.authType === 'jwt') {
      pkg.dependencies['@nestjs/jwt']      = '^10.0.0';
      pkg.dependencies['@nestjs/passport'] = '^10.0.0';
      pkg.dependencies['passport-jwt']     = 'latest';
    }

    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  private buildEnvFile(name: string, dto: GenerateDto, withLogs: boolean, broker: string, topic: string, example = false): string {
    const val = (v: string) => example ? '' : v;
    const lines = [
      `# ${name} — Environment Variables`,
      `# Generated by Jarvis Platform`,
      ``,
      `PORT=${val('3000')}`,
      `NODE_ENV=${val('development')}`,
      ``,
      `# Directorio donde se almacenan los archivos subidos`,
      `UPLOADS_DIR=${val('./uploads')}`,
      ``,
      `# Tamaño máximo por archivo en MB`,
      `MAX_FILE_SIZE_MB=${val('50')}`,
      ``,
      `# MIME types permitidos separados por coma (vacío = todos)`,
      `# Ejemplo: image/jpeg,image/png,application/pdf`,
      `ALLOWED_TYPES=${val('')}`,
    ];

    if (dto.authType === 'jwt') {
      lines.push(``, `# JWT`, `JWT_SECRET=${val('change-me-in-production')}`, `JWT_EXPIRES_IN=${val('1d')}`);
    }

    if (withLogs) {
      lines.push(
        ``, `# Kafka Logger`,
        `KAFKA_BROKER=${val(broker)}`,
        `KAFKA_TOPIC=${val(topic)}`,
      );
    }

    return lines.join('\n') + '\n';
  }

  private buildMediaDockerfile(name: string): string {
    return `# Dockerfile — ${name}
# Multi-stage build generado por Jarvis Platform

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 3000
CMD ["node", "dist/main"]
`;
  }

  private buildMediaReadme(name: string, dto: GenerateDto, withLogs: boolean): string {
    const auth = dto.authType ?? 'none';
    const kafkaSection = withLogs ? `
## Kafka — Audit Trail

Cada operación de archivo genera un evento en Kafka:

| Evento | Trigger | Payload |
|--------|---------|---------|
| \`FILE_UPLOAD\` | POST /files/upload | id, filename, size, mimetype |
| \`FILE_DOWNLOAD\` | GET /files/:id/download | id, filename, mimetype, size |
| \`FILE_DELETE\` | DELETE /files/:id | id, filename |

El **AuditInterceptor** registra además cada request HTTP (método, url, status, duración).
` : '';

    return `# ${name}

> Generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}

## Descripción
Media Service para carga, descarga y gestión de archivos (documentos, imágenes, etc.).

## Stack Tecnológico
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS 10
- **Upload**: Multer (disk storage)
- **Auth**: ${auth}
- **Kafka Logger**: ${withLogs ? 'Sí' : 'No'}
- **API Docs**: Swagger UI (\`/api/docs\`)

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| \`POST\` | \`/files/upload\` | Subir archivo (multipart/form-data) |
| \`GET\` | \`/files\` | Listar todos los archivos |
| \`GET\` | \`/files/:id\` | Obtener metadata de un archivo |
| \`GET\` | \`/files/:id/download\` | Descargar archivo |
| \`DELETE\` | \`/files/:id\` | Eliminar archivo |
${kafkaSection}
## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| \`PORT\` | Puerto del servicio | \`3000\` |
| \`UPLOADS_DIR\` | Directorio de almacenamiento | \`./uploads\` |
| \`MAX_FILE_SIZE_MB\` | Tamaño máximo por archivo | \`50\` |
| \`ALLOWED_TYPES\` | MIME types permitidos (vacío=todos) | \`\` |${withLogs ? `\n| \`KAFKA_BROKER\` | Broker Kafka | \`localhost:9092\` |\n| \`KAFKA_TOPIC\` | Topic de auditoría | \`platform.logs\` |` : ''}

## Instalación

\`\`\`bash
npm install
cp .env.example .env
npm run start:dev
\`\`\`

## Docker

\`\`\`bash
docker build -t ${name} .
docker run -p 3000:3000 --env-file .env -v $(pwd)/uploads:/app/uploads ${name}
\`\`\`

## Swagger UI

Disponible en: \`http://localhost:3000/api/docs\`
`;
  }

  private buildMediaOpenApiSpec(name: string): string {
    return `openapi: "3.0.3"
info:
  title: ${name}
  description: Media Service — Gestión de archivos — Jarvis Platform
  version: "1.0.0"
paths:
  /files/upload:
    post:
      tags: [files]
      summary: Subir un archivo
      operationId: uploadFile
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
      responses:
        "201":
          description: Archivo subido correctamente
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FileMetadata"
  /files:
    get:
      tags: [files]
      summary: Listar todos los archivos
      operationId: listFiles
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/FileMetadata"
  /files/{id}:
    get:
      tags: [files]
      summary: Obtener metadata de un archivo
      operationId: getFile
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FileMetadata"
        "404":
          description: No encontrado
    delete:
      tags: [files]
      summary: Eliminar un archivo
      operationId: deleteFile
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Eliminado
  /files/{id}/download:
    get:
      tags: [files]
      summary: Descargar un archivo
      operationId: downloadFile
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Archivo descargado
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        "404":
          description: No encontrado
components:
  schemas:
    FileMetadata:
      type: object
      properties:
        id:
          type: string
        originalName:
          type: string
        filename:
          type: string
        mimetype:
          type: string
        size:
          type: number
        path:
          type: string
        createdAt:
          type: string
          format: date-time
`;
  }
}
