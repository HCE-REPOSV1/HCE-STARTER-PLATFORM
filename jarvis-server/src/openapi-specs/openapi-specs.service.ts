import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DomainsService } from '../domains/domains.service';

export interface OpenApiSpec {
  id: string;
  name: string;
  domainId: string;
  domainName: string;
  selectedEntities: string[];
  yaml: string;
  createdAt: string;
}

export interface CreateOpenApiSpecDto {
  name: string;
  domainId: string;
  selectedEntities: string[];
}

@Injectable()
export class OpenApiSpecsService {
  private readonly filePath = path.join(process.cwd(), 'config', 'openapi-specs.json');

  constructor(private readonly domainsService: DomainsService) {}

  private read(): OpenApiSpec[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  private write(data: OpenApiSpec[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): OpenApiSpec[] {
    return this.read();
  }

  findOne(id: string): OpenApiSpec {
    const spec = this.read().find((s) => s.id === id);
    if (!spec) throw new NotFoundException(`OpenApiSpec ${id} no encontrado`);
    return spec;
  }

  create(dto: CreateOpenApiSpecDto): OpenApiSpec {
    const domain = this.domainsService.findOne(dto.domainId);
    const filteredEntities = domain.entities.filter((e) =>
      dto.selectedEntities.includes(e.name),
    );
    const yaml = this.buildOpenApiSpec(dto.name, domain.name, filteredEntities);

    const list = this.read();
    const item: OpenApiSpec = {
      id: uuidv4(),
      name: dto.name,
      domainId: dto.domainId,
      domainName: domain.name,
      selectedEntities: dto.selectedEntities,
      yaml,
      createdAt: new Date().toISOString(),
    };
    list.push(item);
    this.write(list);
    return item;
  }

  remove(id: string) {
    const list = this.read().filter((s) => s.id !== id);
    this.write(list);
    return { deleted: true };
  }

  private pascal(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private toOasType(t: string): string {
    const map: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      Date: 'string',
      'Record<string, any>': 'object',
    };
    return map[t] ?? 'string';
  }

  private buildOpenApiSpec(
    name: string,
    domainName: string,
    entities: { name: string; fields: { name: string; type: string; required: boolean }[] }[],
  ): string {
    const lines: string[] = [
      `openapi: "3.0.3"`,
      `info:`,
      `  title: ${name}`,
      `  description: API Contract — Dominio ${domainName} — Jarvis Platform`,
      `  version: "1.0.0"`,
      `paths:`,
    ];

    for (const entity of entities) {
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
    for (const entity of entities) {
      const Tag = this.pascal(entity.name);
      const required = entity.fields.filter((f) => f.required).map((f) => f.name);
      lines.push(`    ${Tag}:`, `      type: object`);
      if (required.length) lines.push(`      required: [${required.join(', ')}]`);
      lines.push(`      properties:`);
      entity.fields.forEach((f) => {
        lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`);
      });

      const dtoFields = entity.fields.filter((f) => f.name !== 'id');
      const dtoRequired = dtoFields.filter((f) => f.required).map((f) => f.name);
      lines.push(`    Create${Tag}Dto:`, `      type: object`);
      if (dtoRequired.length) lines.push(`      required: [${dtoRequired.join(', ')}]`);
      lines.push(`      properties:`);
      dtoFields.forEach((f) => {
        lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`);
      });
    }

    return lines.join('\n');
  }
}
