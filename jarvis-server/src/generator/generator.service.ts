// generator.service.ts — Motor principal de generación de microservicios
// Soporta: UX (API First/OpenAPI), CN (BFF Canal), BS (BFF Negocio)
// Genera: código fuente, Dockerfile, .env, README.md, openapi.yaml
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import archiver from 'archiver';
import { DomainsService } from '../domains/domains.service';
import type { Domain, DomainEntity } from '../domains/domains.service';
import { DatasourceService } from '../datasource/datasource.service';
import type { GenerationConfig } from '../generation-config/generation-config.service';

export interface GenerateDto {
  name: string;
  type: 'UX' | 'CN' | 'BS';
  domainId: string;
  datasourceId?: string;
  // Advanced config (optional — from wizard step 2)
  architecture?: 'hexagonal' | 'clean' | 'layered';
  orm?: 'typeorm' | 'prisma' | 'none';
  apiStyle?: 'rest' | 'graphql';
  authType?: 'none' | 'jwt' | 'oauth';
  observability?: { logs: boolean; metrics: boolean; tracing: boolean };
  gitEnabled?: boolean;
  gitRepoUrl?: string;
  gitBranch?: string;
}

const TYPE_PREFIX: Record<string, string> = { UX: 'ds', CN: 'ms-cn', BS: 'ms-bs' };

@Injectable()
export class GeneratorService {
  constructor(
    private readonly domainsService: DomainsService,
    private readonly datasourceService: DatasourceService,
  ) {}

  async generate(dto: GenerateDto): Promise<{ zipPath: string; serviceName: string }> {
    const domain = this.domainsService.findOne(dto.domainId);
    const prefix = TYPE_PREFIX[dto.type] ?? 'ms-bs';
    const serviceName = `${prefix}-${dto.name.toLowerCase().replace(/\s+/g, '-')}`;
    const tmpDir = path.join(os.tmpdir(), `jarvis-${Date.now()}`, serviceName);

    if (dto.type === 'UX') {
      await this.generateSwaggerContract(tmpDir, serviceName, domain);
    } else {
      await this.generateBffMicroservice(tmpDir, serviceName, domain, dto);
    }

    const zipPath = path.join(os.tmpdir(), `${serviceName}.zip`);
    await this.zipDir(tmpDir, zipPath);
    return { zipPath, serviceName };
  }

  // ─────────────────────────────────────────────────────────────
  // UX → API First: contrato OpenAPI/Swagger completo
  // ─────────────────────────────────────────────────────────────
  private async generateSwaggerContract(dir: string, name: string, domain: Domain) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildOpenApiSpec(name, domain));
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildReadme(name, domain, 'UX', {}));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name, version: '1.0.0',
        scripts: { mock: 'prism mock openapi.yaml', validate: 'swagger-cli validate openapi.yaml' },
        devDependencies: { '@stoplight/prism-cli': 'latest', 'swagger-cli': 'latest' },
      }, null, 2),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CN / BS → BFF NestJS microservice completo
  // ─────────────────────────────────────────────────────────────
  private async generateBffMicroservice(dir: string, name: string, domain: Domain, dto: GenerateDto) {
    const arch = dto.architecture ?? 'hexagonal';
    const srcDir = path.join(dir, 'src');

    // Folder structure based on architecture
    const folders = arch === 'layered'
      ? ['src/controllers', 'src/services', 'src/entities', 'src/dto']
      : ['src/domain/entities', 'src/domain/repositories', 'src/application/use-cases', 'src/infrastructure/controllers', 'src/infrastructure/persistence', 'src/dto'];

    folders.forEach((f) => fs.mkdirSync(path.join(dir, f), { recursive: true }));

    for (const entity of domain.entities) {
      if (arch === 'layered') {
        this.writeLayeredFiles(srcDir, entity, dto.type);
      } else {
        this.writeBffEntity(srcDir, entity);
        this.writeBffRepository(srcDir, entity);
        this.writeBffUseCase(srcDir, entity);
        this.writeBffController(srcDir, entity, dto.type);
      }
      this.writeBffDto(srcDir, entity);
    }

    this.writeBffAppModule(srcDir, domain.entities, dto.type, dto.authType);
    this.writeBffMain(srcDir, name, dto.authType);
    this.writeBffPackageJson(dir, name, dto);
    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    // .env file
    fs.writeFileSync(path.join(dir, '.env'), this.buildEnvFile(name, dto));
    fs.writeFileSync(path.join(dir, '.env.example'), this.buildEnvFile(name, dto, true));

    // Dockerfile (multi-stage)
    fs.writeFileSync(path.join(dir, 'Dockerfile'), this.buildDockerfile(name));
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // README
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildReadme(name, domain, dto.type, dto));

    // openapi.yaml also included in BFF for documentation
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildOpenApiSpec(name, domain));
  }

  // ─── Layered architecture files ─────────────────────────────
  private writeLayeredFiles(src: string, entity: DomainEntity, type: string) {
    const E = this.pascal(entity.name);
    const props = entity.fields.map((f) => `  ${f.name}${f.required ? '!' : '?'}: ${f.type};`).join('\n');

    fs.writeFileSync(path.join(src, 'entities', `${entity.name}.entity.ts`), `export class ${E} {\n${props}\n}\n`);

    fs.writeFileSync(
      path.join(src, 'services', `${entity.name}.service.ts`),
      `import { Injectable } from '@nestjs/common';\nimport { ${E} } from '../entities/${entity.name}.entity';\n\n@Injectable()\nexport class ${E}Service {\n  private items: ${E}[] = [];\n  findAll(): ${E}[] { return this.items; }\n  findOne(id: string): ${E} | undefined { return this.items.find(i => i.id === id); }\n  create(data: Partial<${E}>): ${E} { const item = { id: Date.now().toString(), ...data } as ${E}; this.items.push(item); return item; }\n  remove(id: string): void { this.items = this.items.filter(i => i.id !== id); }\n}\n`,
    );

    const tag = type === 'CN' ? '// BFF Canal\n' : '// BFF Negocio\n';
    fs.writeFileSync(
      path.join(src, 'controllers', `${entity.name}.controller.ts`),
      `${tag}import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';\nimport { ${E}Service } from '../services/${entity.name}.service';\nimport { Create${E}Dto } from '../dto/create-${entity.name}.dto';\n\n@Controller('${entity.name}s')\nexport class ${E}Controller {\n  constructor(private readonly service: ${E}Service) {}\n  @Get() findAll() { return this.service.findAll(); }\n  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }\n  @Post() create(@Body() dto: Create${E}Dto) { return this.service.create(dto); }\n  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string) { this.service.remove(id); }\n}\n`,
    );
  }

  // ─── Hexagonal/Clean architecture files ─────────────────────
  private writeBffEntity(src: string, entity: DomainEntity) {
    const E = this.pascal(entity.name);
    const props = entity.fields.map((f) => `  ${f.name}${f.required ? '!' : '?'}: ${f.type};`).join('\n');
    fs.writeFileSync(path.join(src, 'domain/entities', `${entity.name}.entity.ts`), `export class ${E} {\n${props}\n}\n`);
  }

  private writeBffRepository(src: string, entity: DomainEntity) {
    const E = this.pascal(entity.name);
    fs.writeFileSync(
      path.join(src, 'domain/repositories', `${entity.name}.repository.ts`),
      `import { ${E} } from '../entities/${entity.name}.entity';\n\nexport interface ${E}Repository {\n  save(entity: ${E}): Promise<${E}>;\n  findById(id: string): Promise<${E} | null>;\n  findAll(): Promise<${E}[]>;\n  delete(id: string): Promise<void>;\n}\n`,
    );
  }

  private writeBffUseCase(src: string, entity: DomainEntity) {
    const E = this.pascal(entity.name);
    fs.writeFileSync(
      path.join(src, 'application/use-cases', `${entity.name}.use-case.ts`),
      `import { ${E} } from '../../domain/entities/${entity.name}.entity';\nimport { ${E}Repository } from '../../domain/repositories/${entity.name}.repository';\n\nexport class ${E}UseCase {\n  constructor(private readonly repo: ${E}Repository) {}\n  findAll(): Promise<${E}[]> { return this.repo.findAll(); }\n  findById(id: string): Promise<${E} | null> { return this.repo.findById(id); }\n  create(data: Partial<${E}>): Promise<${E}> { return this.repo.save(data as ${E}); }\n  delete(id: string): Promise<void> { return this.repo.delete(id); }\n}\n`,
    );
  }

  private writeBffController(src: string, entity: DomainEntity, type: string) {
    const E = this.pascal(entity.name);
    const tag = type === 'CN' ? '// BFF Canal — orquesta llamadas a servicios externos\n' : '// BFF Negocio — aplica reglas de negocio\n';
    fs.writeFileSync(
      path.join(src, 'infrastructure/controllers', `${entity.name}.controller.ts`),
      `${tag}import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';\nimport { Create${E}Dto } from '../../dto/create-${entity.name}.dto';\n\n@Controller('${entity.name}s')\nexport class ${E}Controller {\n  @Get() findAll() { return []; }\n  @Get(':id') findOne(@Param('id') id: string) { return { id }; }\n  @Post() create(@Body() dto: Create${E}Dto) { return dto; }\n  @Put(':id') update(@Param('id') id: string, @Body() dto: Partial<Create${E}Dto>) { return { id, ...dto }; }\n  @Delete(':id') @HttpCode(204) remove(@Param('id') _id: string) {}\n}\n`,
    );
  }

  private writeBffDto(src: string, entity: DomainEntity) {
    const E = this.pascal(entity.name);
    const dtoDir = src.includes('infrastructure') ? path.join(path.dirname(src), 'dto') : path.join(src, 'dto');
    const fields = entity.fields.filter((f) => f.name !== 'id').map((f) => `  ${f.name}${f.required ? '!' : '?'}: ${f.type};`).join('\n');
    fs.writeFileSync(path.join(src, 'dto', `create-${entity.name}.dto.ts`), `export class Create${E}Dto {\n${fields}\n}\n`);
  }

  private writeBffAppModule(src: string, entities: DomainEntity[], type: string, authType?: string) {
    const isLayered = !fs.existsSync(path.join(src, 'domain'));
    const ctrlPath = isLayered ? './controllers' : './infrastructure/controllers';
    const svcPath = isLayered ? './services' : null;

    const ctrlImports = entities.map((e) => `import { ${this.pascal(e.name)}Controller } from '${ctrlPath}/${e.name}.controller';`).join('\n');
    const svcImports = isLayered ? entities.map((e) => `import { ${this.pascal(e.name)}Service } from './services/${e.name}.service';`).join('\n') : '';
    const controllers = entities.map((e) => `${this.pascal(e.name)}Controller`).join(', ');
    const providers = isLayered ? entities.map((e) => `${this.pascal(e.name)}Service`).join(', ') : '';
    const comment = type === 'CN' ? '// BFF Canal' : '// BFF Negocio';

    fs.writeFileSync(
      path.join(src, 'app.module.ts'),
      `${comment}\nimport { Module } from '@nestjs/common';\n${ctrlImports}\n${svcImports}\n\n@Module({\n  controllers: [${controllers}],\n  ${providers ? `providers: [${providers}],` : ''}\n})\nexport class AppModule {}\n`,
    );
  }

  private writeBffMain(src: string, name: string, authType?: string) {
    const authImport = authType === 'jwt' ? `\nimport { ValidationPipe } from '@nestjs/common';` : '';
    fs.writeFileSync(
      path.join(src, 'main.ts'),
      `import { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\nimport { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';${authImport}\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  app.enableCors();\n  const config = new DocumentBuilder()\n    .setTitle('${name}')\n    .setDescription('Generado por Jarvis Platform')\n    .setVersion('1.0')\n    ${authType === 'jwt' ? ".addBearerAuth()" : ""}\n    .build();\n  const document = SwaggerModule.createDocument(app, config);\n  SwaggerModule.setup('api/docs', app, document);\n  const port = process.env.PORT ?? 3000;\n  await app.listen(port);\n  console.log(\`Service: http://localhost:\${port}\`);\n  console.log(\`Swagger: http://localhost:\${port}/api/docs\`);\n}\nbootstrap();\n`,
    );
  }

  private writeBffPackageJson(dir: string, name: string, dto: GenerateDto) {
    const pkg: any = {
      name, version: '1.0.0',
      scripts: { start: 'node dist/main', build: 'tsc -p tsconfig.json', 'start:dev': 'ts-node -r tsconfig-paths/register src/main.ts' },
      dependencies: {
        '@nestjs/common': '^10.0.0', '@nestjs/core': '^10.0.0',
        '@nestjs/platform-express': '^10.0.0', '@nestjs/swagger': '^7.0.0',
        'reflect-metadata': '^0.1.13', rxjs: '^7.8.0',
      },
      devDependencies: { typescript: '^5.0.0', 'ts-node': '^10.0.0', 'tsconfig-paths': '^4.0.0' },
    };

    // ORM dependencies
    if (dto.orm === 'typeorm') {
      pkg.dependencies['@nestjs/typeorm'] = '^10.0.0';
      pkg.dependencies['typeorm'] = '^0.3.0';
    } else if (dto.orm === 'prisma') {
      pkg.dependencies['@prisma/client'] = 'latest';
      pkg.devDependencies['prisma'] = 'latest';
    }

    // Auth dependencies
    if (dto.authType === 'jwt') {
      pkg.dependencies['@nestjs/jwt'] = '^10.0.0';
      pkg.dependencies['@nestjs/passport'] = '^10.0.0';
      pkg.dependencies['passport-jwt'] = 'latest';
    }

    // Datasource driver
    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
        pkg.dependencies[ds.npmLibrary] = 'latest';
      } catch {}
    }

    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  private writeBffTsConfig(dir: string) {
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { module: 'commonjs', target: 'ES2021', strict: true, outDir: './dist', experimentalDecorators: true, emitDecoratorMetadata: true, paths: { '@/*': ['src/*'] } } }, null, 2),
    );
  }

  // ─── .env file ───────────────────────────────────────────────
  private buildEnvFile(name: string, dto: GenerateDto, example = false): string {
    const val = (v: string) => example ? '' : v;
    const lines = [
      `# ${name} — Environment Variables`,
      `# Generated by Jarvis Platform`,
      ``,
      `PORT=${val('3000')}`,
      `NODE_ENV=${val('development')}`,
    ];
    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
        lines.push(``, `# Database`, `DB_HOST=${val(ds.host)}`, `DB_PORT=${val(String(ds.port))}`, `DB_USER=${val(ds.username)}`, `DB_PASS=${val(example ? '***' : ds.password)}`, `DB_NAME=${val(ds.database)}`);
      } catch {}
    }
    if (dto.authType === 'jwt') {
      lines.push(``, `# JWT`, `JWT_SECRET=${val('change-me-in-production')}`, `JWT_EXPIRES_IN=${val('1d')}`);
    }
    return lines.join('\n') + '\n';
  }

  // ─── Dockerfile multi-stage ──────────────────────────────────
  private buildDockerfile(name: string): string {
    return `# Dockerfile — ${name}
# Multi-stage build generado por Jarvis Platform

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
`;
  }

  // ─── README.md ───────────────────────────────────────────────
  private buildReadme(name: string, domain: Domain, type: string, dto: Partial<GenerateDto>): string {
    const strategy = type === 'UX' ? 'API First (OpenAPI Contract)' : type === 'CN' ? 'BFF Canal (Integración)' : 'BFF Negocio (Lógica de negocio)';
    const arch = dto.architecture ?? 'hexagonal';
    const orm = dto.orm ?? 'none';
    const auth = dto.authType ?? 'none';

    const entities = domain.entities.map((e) =>
      `### ${this.pascal(e.name)}\n| Campo | Tipo | Requerido |\n|-------|------|----------|\n${e.fields.map((f) => `| ${f.name} | ${f.type} | ${f.required ? '✓' : '—'} |`).join('\n')}`
    ).join('\n\n');

    const endpoints = domain.entities.map((e) =>
      `- \`GET    /${e.name}s\` — Listar\n- \`GET    /${e.name}s/:id\` — Obtener\n- \`POST   /${e.name}s\` — Crear\n- \`PUT    /${e.name}s/:id\` — Actualizar\n- \`DELETE /${e.name}s/:id\` — Eliminar`
    ).join('\n');

    return `# ${name}

> Generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}

## Estrategia
${strategy}

## Stack Tecnológico
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS 10
- **Arquitectura**: ${arch}
- **ORM**: ${orm}
- **Auth**: ${auth}
- **API Docs**: Swagger UI (\`/api/docs\`)

## Dominio: ${domain.name}

${entities}

## Endpoints

${endpoints}

## Instalación

\`\`\`bash
npm install
cp .env.example .env
# Editar .env con tus valores
npm run start:dev
\`\`\`

## Docker

\`\`\`bash
docker build -t ${name} .
docker run -p 3000:3000 --env-file .env ${name}
\`\`\`

## Swagger UI

Disponible en: \`http://localhost:3000/api/docs\`
`;
  }

  // ─── OpenAPI spec ────────────────────────────────────────────
  private buildOpenApiSpec(name: string, domain: Domain): string {
    const lines: string[] = [`openapi: "3.0.3"`, `info:`, `  title: ${name}`, `  description: API Contract — Dominio ${domain.name} — Jarvis Platform`, `  version: "1.0.0"`, `paths:`];

    for (const entity of domain.entities) {
      const tag = entity.name;
      const Tag = this.pascal(tag);
      lines.push(
        `  /${tag}s:`,
        `    get:`, `      tags: [${Tag}]`, `      summary: Listar ${tag}s`, `      operationId: findAll${Tag}s`,
        `      responses:`, `        "200":`, `          description: OK`, `          content:`, `            application/json:`, `              schema:`, `                type: array`, `                items:`, `                  $ref: "#/components/schemas/${Tag}"`,
        `    post:`, `      tags: [${Tag}]`, `      summary: Crear ${tag}`, `      operationId: create${Tag}`,
        `      requestBody:`, `        required: true`, `        content:`, `          application/json:`, `            schema:`, `              $ref: "#/components/schemas/Create${Tag}Dto"`,
        `      responses:`, `        "201":`, `          description: Creado`, `          content:`, `            application/json:`, `              schema:`, `                $ref: "#/components/schemas/${Tag}"`,
        `  /${tag}s/{id}:`,
        `    get:`, `      tags: [${Tag}]`, `      summary: Obtener ${tag}`, `      operationId: findOne${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`, `          schema:`, `            type: string`,
        `      responses:`, `        "200":`, `          description: OK`, `          content:`, `            application/json:`, `              schema:`, `                $ref: "#/components/schemas/${Tag}"`,
        `        "404":`, `          description: No encontrado`,
        `    put:`, `      tags: [${Tag}]`, `      summary: Actualizar ${tag}`, `      operationId: update${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`, `          schema:`, `            type: string`,
        `      requestBody:`, `        required: true`, `        content:`, `          application/json:`, `            schema:`, `              $ref: "#/components/schemas/Create${Tag}Dto"`,
        `      responses:`, `        "200":`, `          description: Actualizado`,
        `    delete:`, `      tags: [${Tag}]`, `      summary: Eliminar ${tag}`, `      operationId: delete${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`, `          schema:`, `            type: string`,
        `      responses:`, `        "204":`, `          description: Eliminado`,
      );
    }

    lines.push(`components:`, `  schemas:`);
    for (const entity of domain.entities) {
      const Tag = this.pascal(entity.name);
      const required = entity.fields.filter((f) => f.required).map((f) => f.name);
      lines.push(`    ${Tag}:`, `      type: object`);
      if (required.length) lines.push(`      required: [${required.join(', ')}]`);
      lines.push(`      properties:`);
      entity.fields.forEach((f) => { lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`); });

      const dtoFields = entity.fields.filter((f) => f.name !== 'id');
      const dtoRequired = dtoFields.filter((f) => f.required).map((f) => f.name);
      lines.push(`    Create${Tag}Dto:`, `      type: object`);
      if (dtoRequired.length) lines.push(`      required: [${dtoRequired.join(', ')}]`);
      lines.push(`      properties:`);
      dtoFields.forEach((f) => { lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`); });
    }

    return lines.join('\n');
  }

  // ─── Helpers ─────────────────────────────────────────────────
  private pascal(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  private toOasType(t: string): string {
    const map: Record<string, string> = { string: 'string', number: 'number', boolean: 'boolean', Date: 'string', 'Record<string, any>': 'object' };
    return map[t] ?? 'string';
  }

  private zipDir(sourceDir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
