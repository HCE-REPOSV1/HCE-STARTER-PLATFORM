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
