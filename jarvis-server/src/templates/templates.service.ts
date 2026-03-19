// templates.service.ts — Gestión de templates de generación
// Permite registrar, versionar y consultar templates disponibles.
import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type TemplateType = 'nestjs' | 'react' | 'openapi' | 'docker' | 'readme';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  version: string;
  description: string;
  path: string;       // relative path inside /templates folder
  active: boolean;
  createdAt: string;
}

@Injectable()
export class TemplatesService {
  private readonly filePath = path.join(process.cwd(), 'config', 'templates.json');

  private read(): Template[] {
    if (!fs.existsSync(this.filePath)) {
      // Seed built-in templates
      const seed: Template[] = [
        { id: uuidv4(), name: 'NestJS Hexagonal', type: 'nestjs', version: '1.0.0', description: 'Arquitectura hexagonal con NestJS 10', path: 'nestjs/hexagonal', active: true, createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'NestJS Clean', type: 'nestjs', version: '1.0.0', description: 'Clean Architecture con NestJS', path: 'nestjs/clean', active: true, createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'OpenAPI 3.0', type: 'openapi', version: '3.0.3', description: 'Contrato OpenAPI API First', path: 'openapi/v3', active: true, createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Dockerfile NestJS', type: 'docker', version: '1.0.0', description: 'Dockerfile multi-stage para NestJS', path: 'docker/nestjs', active: true, createdAt: new Date().toISOString() },
      ];
      this.write(seed);
      return seed;
    }
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  private write(data: Template[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): Template[] { return this.read(); }

  findOne(id: string): Template {
    const t = this.read().find((x) => x.id === id);
    if (!t) throw new NotFoundException(`Template ${id} no encontrado`);
    return t;
  }

  findByType(type: TemplateType): Template[] {
    return this.read().filter((t) => t.type === type && t.active);
  }

  create(dto: Omit<Template, 'id' | 'createdAt'>): Template {
    const list = this.read();
    const item: Template = { id: uuidv4(), ...dto, createdAt: new Date().toISOString() };
    list.push(item);
    this.write(list);
    return item;
  }

  update(id: string, dto: Partial<Omit<Template, 'id' | 'createdAt'>>): Template {
    const list = this.read();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new NotFoundException(`Template ${id} no encontrado`);
    list[idx] = { ...list[idx], ...dto };
    this.write(list);
    return list[idx];
  }

  remove(id: string) {
    const list = this.read().filter((t) => t.id !== id);
    this.write(list);
    return { deleted: true };
  }
}
