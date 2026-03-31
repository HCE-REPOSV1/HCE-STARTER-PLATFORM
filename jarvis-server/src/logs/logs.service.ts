// logs.service.ts — Auditoría global del sistema
// Persiste en config/logs.json — sobrevive reinicios del servidor
// Se inyecta en todos los módulos para registrar cada acción
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, LogFilters } from './log.interface';

@Injectable()
export class LogsService {
  private readonly filePath = path.join(process.cwd(), 'config', 'logs.json');

  private read(): LogEntry[] {
    if (!fs.existsSync(this.filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private write(data: LogEntry[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  // Registra una acción en el log — llamado desde todos los controllers
  add(user: string, action: string, details: Record<string, any> = {}): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      user,
      action,
      module: this.inferModule(action),
      level: this.inferLevel(action),
      details,
    };
    const list = this.read();
    list.push(entry);
    this.write(list);
    return entry;
  }

  // Retorna logs con filtros opcionales — más recientes primero
  findAll(filters: LogFilters = {}): LogEntry[] {
    let list = this.read().reverse();

    if (filters.user)   list = list.filter(l => l.user.toLowerCase().includes(filters.user!.toLowerCase()));
    if (filters.action) list = list.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
    if (filters.module) list = list.filter(l => l.module === filters.module);
    if (filters.level)  list = list.filter(l => l.level === filters.level);

    return list;
  }

  // Deriva el módulo desde el nombre de la acción
  private inferModule(action: string): string {
    if (action.includes('DATASOURCE')) return 'datasources';
    if (action.includes('DOMAIN'))     return 'domains';
    if (action.includes('GENERATE'))   return 'generator';
    if (action.includes('USER'))       return 'users';
    if (action.includes('TEMPLATE'))   return 'templates';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'auth';
    return 'system';
  }

  // Deriva el nivel de severidad desde el nombre de la acción
  private inferLevel(action: string): 'INFO' | 'WARN' | 'ERROR' {
    if (action.includes('FAILED') || action.includes('ERROR')) return 'ERROR';
    if (action.includes('WARN') || action.includes('DELETE'))  return 'WARN';
    return 'INFO';
  }
}
