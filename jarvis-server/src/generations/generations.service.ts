// generations.service.ts — Historial de generaciones con estado y re-descarga
import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GenerationStatus, Generation } from './generation.interface';

@Injectable()
export class GenerationsService {
  private readonly filePath = path.join(process.cwd(), 'config', 'generations.json');

  private read(): Generation[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  private write(data: Generation[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): Generation[] { return [...this.read()].reverse(); }

  findOne(id: string): Generation {
    const g = this.read().find((x) => x.id === id);
    if (!g) throw new NotFoundException(`Generation ${id} no encontrada`);
    return g;
  }

  record(dto: Omit<Generation, 'id' | 'createdAt'>): Generation {
    const list = this.read();
    const item: Generation = { id: uuidv4(), ...dto, createdAt: new Date().toISOString() };
    list.push(item);
    this.write(list);
    return item;
  }

  updateStatus(id: string, status: GenerationStatus, zipPath?: string, errorMessage?: string) {
    const list = this.read();
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], status, ...(zipPath && { zipPath }), ...(errorMessage && { errorMessage }) };
    this.write(list);
    return list[idx];
  }

  remove(id: string) {
    const list = this.read().filter((g) => g.id !== id);
    this.write(list);
    return { deleted: true };
  }
}
