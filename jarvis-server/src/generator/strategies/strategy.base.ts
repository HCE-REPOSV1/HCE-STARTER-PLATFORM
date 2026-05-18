import * as fs from 'fs';
import * as path from 'path';
import type { Domain } from '../../domains/domain.interface';
import type { GenField } from '../gen-entity.interface';
import type { GenerateDto } from '../generator.interface';
export interface IGeneratorStrategy {
  generate(dir: string, name: string, dto: GenerateDto, domain?: Domain): Promise<void>;
}

export abstract class GeneratorStrategyBase implements IGeneratorStrategy {
  abstract generate(dir: string, name: string, dto: GenerateDto, domain?: Domain): Promise<void>;

  protected pascal(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  protected isSqlServer(engine: string): boolean {
    const e = engine.toLowerCase();
    return e.includes('sql server') || e.includes('mssql') || e.includes('sqlserver');
  }

  protected buildTypeOrmProp(field: GenField): string {
    if (field.isPk) return `  @PrimaryColumn()\n  ${field.name}!: ${field.type};`;
    const opts = field.nullable ? '{ nullable: true }' : '';
    return `  @Column(${opts})\n  ${field.name}${field.nullable ? '?' : '!'}: ${field.type};`;
  }

  protected toOasType(t: string): string {
    const map: Record<string, string> = {
      string: 'string', number: 'number', boolean: 'boolean',
      Date: 'string', 'Record<string, any>': 'object',
    };
    return map[t] ?? 'string';
  }

  protected writeBffTsConfig(dir: string): void {
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'commonjs', target: 'ES2021', strict: true,
          outDir: './dist', baseUrl: './',
          experimentalDecorators: true, emitDecoratorMetadata: true,
          paths: { '@/*': ['src/*'] },
        },
      }, null, 2),
    );
  }

  protected buildDockerCompose(name: string, defaultPort = 3000, extraPorts: number[] = [], healthPath = '/health'): string {
    const allPorts = [defaultPort, ...extraPorts];
    const portLines = allPorts.map((p, i) => {
      const varName = i === 0 ? 'PORT' : 'PORT_' + p;
      return `      - "\${${varName}:-${p}}:\${${varName}:-${p}}"`;
    }).join('\n');

    return `# docker-compose.yml — ${name}
# Uso: docker compose up -d  |  docker compose down  |  docker compose build

services:
  ${name}:
    build: .
    ports:
${portLines}
    env_file: .env
    environment:
      NODE_ENV: production
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:\${PORT:-${defaultPort}}${healthPath} || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
`;
  }

  protected buildDockerfile(name: string): string {
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

  protected buildReadme(name: string, domain: Domain, type: string, dto: Partial<GenerateDto>): string {
    const strategy = type === 'UX'
      ? 'API First (OpenAPI Contract)'
      : type === 'CN' ? 'BFF Canal (Integración)' : 'BFF Negocio (Lógica de negocio)';
    const arch   = dto.architecture ?? 'hexagonal';
    const orm    = dto.orm    ?? 'none';
    const auth   = dto.authType ?? 'none';
    const tables = dto.selectedTables?.length
      ? `\n\n**Tablas de BD:** ${dto.selectedTables.join(', ')}`
      : '';

    const entities = domain.entities.map(e =>
      `### ${this.pascal(e.name)}\n| Campo | Tipo | Requerido |\n|-------|------|----------|\n` +
      e.fields.map(f => `| ${f.name} | ${f.type} | ${f.required ? '✓' : '—'} |`).join('\n')
    ).join('\n\n');

    const endpoints = domain.entities.map(e =>
      `- \`GET    /${e.name}s\` — Listar\n` +
      `- \`GET    /${e.name}s/:id\` — Obtener\n` +
      `- \`POST   /${e.name}s\` — Crear\n` +
      `- \`PUT    /${e.name}s/:id\` — Actualizar\n` +
      `- \`DELETE /${e.name}s/:id\` — Eliminar`
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
- **API Docs**: Swagger UI (\`/api/docs\`)${tables}

## Dominio: ${domain.name}

${entities}

## Endpoints

${endpoints}

## Instalación

\`\`\`bash
npm install
cp .env.example .env
# Editar .env con tus valores reales
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

  /**
   * Genera el contenido de db.config.ts adaptado al motor de BD detectado.
   * Reutilizable por BffStrategy y LgStrategy.
   */
  protected buildTypeOrmFactory(dbEngine: string, instanceName?: string): string {
    const lines: string[] = [
      `// db.config.ts — Configuración de base de datos`,
      `// Las credenciales se leen desde variables de entorno en tiempo de ejecución`,
      `//`,
      `// ─── Fuentes de variables según ambiente ──────────────────`,
      `// Local dev  : archivo .env (solo desarrollo)`,
      `// Docker     : variables en docker run / docker-compose`,
      `// Kubernetes : Secrets de K8s montados como env vars`,
      `// Azure      : Azure Key Vault + App Configuration`,
      `// AWS        : Secrets Manager + Parameter Store`,
      `// HashiCorp  : Vault Agent Sidecar`,
      `// ──────────────────────────────────────────────────────────`,
      `import { ConfigService } from '@nestjs/config';`,
      `import { TypeOrmModuleOptions } from '@nestjs/typeorm';`,
      ``,
      `export function dbConfig(cfg: ConfigService): TypeOrmModuleOptions {`,
    ];

    if (dbEngine === 'mssql') {
      lines.push(
        `  return {`,
        `    type: 'mssql',`,
        `    host:     cfg.get<string>('DB_HOST', 'localhost'),`,
        `    port:     cfg.get<number>('DB_PORT', 1433),`,
        `    username: cfg.get<string>('DB_USER'),`,
        `    password: cfg.get<string>('DB_PASS'),`,
        `    database: cfg.get<string>('DB_NAME'),`,
        `    options: {`,
        `      encrypt:                false,`,
        `      trustServerCertificate: true,`,
        `      connectTimeout:         30000,`,
        instanceName
          ? `      instanceName: cfg.get<string>('DB_INSTANCE', '${instanceName}'),`
          : `      instanceName: cfg.get<string>('DB_INSTANCE') || undefined,`,
        `    },`,
        `    pool: { max: 25, min: 0 },`,
        `    autoLoadEntities: true,`,
        `    synchronize: false,`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    } else if (dbEngine === 'mysql') {
      lines.push(
        `  return {`,
        `    type: 'mysql',`,
        `    host:     cfg.get<string>('DB_HOST', 'localhost'),`,
        `    port:     cfg.get<number>('DB_PORT', 3306),`,
        `    username: cfg.get<string>('DB_USER'),`,
        `    password: cfg.get<string>('DB_PASS'),`,
        `    database: cfg.get<string>('DB_NAME'),`,
        `    autoLoadEntities: true,`,
        `    synchronize: false,`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    } else {
      lines.push(
        `  return {`,
        `    type: 'postgres',`,
        `    host:     cfg.get<string>('DB_HOST', 'localhost'),`,
        `    port:     cfg.get<number>('DB_PORT', 5432),`,
        `    username: cfg.get<string>('DB_USER'),`,
        `    password: cfg.get<string>('DB_PASS'),`,
        `    database: cfg.get<string>('DB_NAME'),`,
        `    ssl: cfg.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,`,
        `    autoLoadEntities: true,`,
        `    synchronize: false,`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    }

    lines.push(`}`, ``);
    return lines.join('\n');
  }

  protected writeKafkaLoggerModule(src: string, serviceName: string, broker: string, topic: string): void {
    fs.mkdirSync(path.join(src, 'logger'), { recursive: true });

    fs.writeFileSync(path.join(src, 'logger', 'kafka-logger.service.ts'), `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';

export interface AuditLogEntry {
  traceId?:   string;
  userId?:    string;
  username?:  string;
  sessionId?: string;
  level?:       string;
  eventType?:   string;
  action?:      string;
  outcome?:     string;
  message?:     string;
  payload?:     Record<string, any>;
}

@Injectable()
export class KafkaLoggerService implements OnModuleInit, OnModuleDestroy {
  private producer!: Producer;

  constructor(private readonly cfg: ConfigService) {}

  async onModuleInit() {
    const kafka = new Kafka({
      clientId: '${serviceName}-logger',
      brokers: (this.cfg.get<string>('KAFKA_BROKER', '${broker}')).split(','),
      logLevel: logLevel.ERROR,
    });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.producer.send({
        topic: this.cfg.get<string>('KAFKA_TOPIC', '${topic}'),
        messages: [{
          value: JSON.stringify({
            source_system: '${serviceName}',
            event_type:    entry.eventType  ?? 'SERVICE_CALL',
            level:         entry.level      ?? 'INFO',
            trace_id:      entry.traceId,
            user_id:       entry.userId,
            username:      entry.username,
            session_id:    entry.sessionId,
            action:        entry.action     ?? entry.message ?? '',
            outcome:       entry.outcome    ?? 'SUCCESS',
            message:       entry.message    ?? '',
            payload:       entry.payload    ?? {},
            timestamp:     new Date().toISOString(),
          }),
        }],
      });
    } catch {
      // Fire and forget — nunca interrumpe el flujo de negocio
    }
  }

  extractAuditContext(headers: Record<string, any>): Pick<AuditLogEntry, 'traceId' | 'userId' | 'username' | 'sessionId'> {
    return {
      traceId:   headers['x-trace-id']   as string | undefined,
      userId:    headers['x-user-id']    as string | undefined,
      username:  headers['x-username']   as string | undefined,
      sessionId: headers['x-session-id'] as string | undefined,
    };
  }
}
`);

    fs.writeFileSync(path.join(src, 'logger', 'audit.interceptor.ts'), `import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { KafkaLoggerService } from './kafka-logger.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly logger: KafkaLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req   = context.switchToHttp().getRequest();
    const start = Date.now();
    const auditCtx = this.logger.extractAuditContext(req.headers);

    return next.handle().pipe(
      tap({
        next: () => {
          const res      = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log({
            ...auditCtx,
            eventType: 'SERVICE_CALL',
            level:     res.statusCode < 400 ? 'INFO' : 'WARN',
            action:    \`\${req.method} \${req.url}\`,
            outcome:   res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
            message:   \`\${req.method} \${req.url} — \${res.statusCode} (\${duration}ms)\`,
            payload:   { method: req.method, url: req.url, statusCode: res.statusCode, duration },
          });
        },
        error: (err) => {
          const duration = Date.now() - start;
          this.logger.log({
            ...auditCtx,
            eventType: 'SERVICE_CALL',
            level:     'ERROR',
            action:    \`\${req.method} \${req.url}\`,
            outcome:   'ERROR',
            message:   \`\${req.method} \${req.url} — ERROR (\${duration}ms): \${err?.message}\`,
            payload:   { method: req.method, url: req.url, duration, error: err?.message },
          });
        },
      }),
    );
  }
}
`);

    fs.writeFileSync(path.join(src, 'logger', 'kafka-logger.module.ts'), `import { Module } from '@nestjs/common';
import { KafkaLoggerService } from './kafka-logger.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  providers: [KafkaLoggerService, AuditInterceptor],
  exports:   [KafkaLoggerService, AuditInterceptor],
})
export class KafkaLoggerModule {}
`);
  }

  protected buildOpenApiSpec(name: string, domain: Domain): string {
    const lines: string[] = [
      `openapi: "3.0.3"`,
      `info:`,
      `  title: ${name}`,
      `  description: API Contract — Dominio ${domain.name} — Jarvis Platform`,
      `  version: "1.0.0"`,
      `paths:`,
    ];

    for (const entity of domain.entities) {
      const tag = entity.name;
      const Tag = this.pascal(tag);
      lines.push(
        `  /${tag}s:`,
        `    get:`, `      tags: [${Tag}]`, `      summary: Listar ${tag}s`, `      operationId: findAll${Tag}s`,
        `      responses:`, `        "200":`, `          description: OK`, `          content:`,
        `            application/json:`, `              schema:`, `                type: array`,
        `                items:`, `                  $ref: "#/components/schemas/${Tag}"`,
        `    post:`, `      tags: [${Tag}]`, `      summary: Crear ${tag}`, `      operationId: create${Tag}`,
        `      requestBody:`, `        required: true`, `        content:`,
        `          application/json:`, `            schema:`, `              $ref: "#/components/schemas/Create${Tag}Dto"`,
        `      responses:`, `        "201":`, `          description: Creado`, `          content:`,
        `            application/json:`, `              schema:`, `                $ref: "#/components/schemas/${Tag}"`,
        `  /${tag}s/{id}:`,
        `    get:`, `      tags: [${Tag}]`, `      summary: Obtener ${tag}`, `      operationId: findOne${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`,
        `          schema:`, `            type: string`,
        `      responses:`, `        "200":`, `          description: OK`, `          content:`,
        `            application/json:`, `              schema:`, `                $ref: "#/components/schemas/${Tag}"`,
        `        "404":`, `          description: No encontrado`,
        `    put:`, `      tags: [${Tag}]`, `      summary: Actualizar ${tag}`, `      operationId: update${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`,
        `          schema:`, `            type: string`,
        `      requestBody:`, `        required: true`, `        content:`,
        `          application/json:`, `            schema:`, `              $ref: "#/components/schemas/Create${Tag}Dto"`,
        `      responses:`, `        "200":`, `          description: Actualizado`,
        `    delete:`, `      tags: [${Tag}]`, `      summary: Eliminar ${tag}`, `      operationId: delete${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`,
        `          schema:`, `            type: string`,
        `      responses:`, `        "204":`, `          description: Eliminado`,
      );
    }

    lines.push(`components:`, `  schemas:`);
    for (const entity of domain.entities) {
      const Tag      = this.pascal(entity.name);
      const required = entity.fields.filter(f => f.required).map(f => f.name);
      lines.push(`    ${Tag}:`, `      type: object`);
      if (required.length) lines.push(`      required: [${required.join(', ')}]`);
      lines.push(`      properties:`);
      entity.fields.forEach(f => lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`));

      const dtoFields   = entity.fields.filter(f => f.name !== 'id');
      const dtoRequired = dtoFields.filter(f => f.required).map(f => f.name);
      lines.push(`    Create${Tag}Dto:`, `      type: object`);
      if (dtoRequired.length) lines.push(`      required: [${dtoRequired.join(', ')}]`);
      lines.push(`      properties:`);
      dtoFields.forEach(f => lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`));
    }

    return lines.join('\n');
  }
}
