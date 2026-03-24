// generation-config.service.ts — Configuración avanzada de generación
// Permite definir arquitectura, ORM, API style, auth, observabilidad y Git.
import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Architecture, OrmType, ApiStyle, AuthType, Observability, GenerationConfig } from './generation-config.interface';

const DEFAULT_OBS: Observability = { logs: true, metrics: false, tracing: false };

@Injectable()
export class GenerationConfigService {
  private readonly filePath = path.join(process.cwd(), 'config', 'generation-configs.json');

  private read(): GenerationConfig[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  private write(data: GenerationConfig[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): GenerationConfig[] { return this.read(); }

  findOne(id: string): GenerationConfig {
    const c = this.read().find((x) => x.id === id);
    if (!c) throw new NotFoundException(`Config ${id} no encontrada`);
    return c;
  }

  create(dto: Omit<GenerationConfig, 'id' | 'createdAt'>): GenerationConfig {
    const list = this.read();
    const item: GenerationConfig = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...dto,
      observability: dto.observability ?? DEFAULT_OBS,
      gitBranch: dto.gitBranch ?? 'main',
    };
    list.push(item);
    this.write(list);
    return item;
  }

  update(id: string, dto: Partial<Omit<GenerationConfig, 'id' | 'createdAt'>>): GenerationConfig {
    const list = this.read();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new NotFoundException(`Config ${id} no encontrada`);
    list[idx] = { ...list[idx], ...dto };
    this.write(list);
    return list[idx];
  }

  remove(id: string) {
    const list = this.read().filter((c) => c.id !== id);
    this.write(list);
    return { deleted: true };
  }
}
