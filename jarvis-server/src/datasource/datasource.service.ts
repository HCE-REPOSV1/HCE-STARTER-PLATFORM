// datasource.service.ts — CRUD + introspección real de base de datos
// Soporta PostgreSQL (pg) y MySQL (mysql2) para listar tablas y columnas.
import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Datasource {
  id: string;
  engine: string;       // PostgreSQL | MySQL
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  npmLibrary: string;
  status?: 'active' | 'failed' | 'untested';
  lastTestedAt?: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  columns: TableColumn[];
}

// Map SQL types to TypeScript types
const SQL_TO_TS: Record<string, string> = {
  int: 'number', integer: 'number', bigint: 'number', smallint: 'number',
  numeric: 'number', decimal: 'number', float: 'number', double: 'number', real: 'number',
  varchar: 'string', char: 'string', text: 'string', uuid: 'string',
  'character varying': 'string', 'character': 'string',
  boolean: 'boolean', bool: 'boolean',
  date: 'Date', timestamp: 'Date', 'timestamp without time zone': 'Date', 'timestamp with time zone': 'Date',
  json: 'Record<string, any>', jsonb: 'Record<string, any>',
};

export function sqlTypeToTs(sqlType: string): string {
  const normalized = sqlType.toLowerCase().split('(')[0].trim();
  return SQL_TO_TS[normalized] ?? 'string';
}

@Injectable()
export class DatasourceService {
  private readonly filePath = path.join(process.cwd(), 'config', 'datasources.json');

  private read(): Datasource[] {
    if (!fs.existsSync(this.filePath)) return [];
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
  }

  private write(data: Datasource[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  findAll(): Datasource[] { return this.read(); }

  findOne(id: string): Datasource {
    const ds = this.read().find((d) => d.id === id);
    if (!ds) throw new NotFoundException(`Datasource ${id} no encontrado`);
    return ds;
  }

  create(dto: Omit<Datasource, 'id'>): Datasource {
    const list = this.read();
    const item: Datasource = { id: uuidv4(), status: 'untested', ...dto };
    list.push(item);
    this.write(list);
    return item;
  }

  update(id: string, dto: Partial<Omit<Datasource, 'id'>>): Datasource {
    const list = this.read();
    const idx = list.findIndex((d) => d.id === id);
    if (idx === -1) throw new NotFoundException(`Datasource ${id} no encontrado`);
    list[idx] = { ...list[idx], ...dto };
    this.write(list);
    return list[idx];
  }

  remove(id: string) {
    const list = this.read().filter((d) => d.id !== id);
    this.write(list);
    return { deleted: true };
  }

  // ─── Real connection test ───────────────────────────────────
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const ds = this.findOne(id);
    try {
      if (ds.engine.toLowerCase().includes('postgres')) {
        await this.testPostgres(ds);
      } else if (ds.engine.toLowerCase().includes('mysql')) {
        await this.testMysql(ds);
      } else {
        // Simulated for unsupported engines
        return { success: true, message: `Conexión simulada a ${ds.database} (motor ${ds.engine} no soportado para test real)` };
      }
      this.update(id, { status: 'active', lastTestedAt: new Date().toISOString() });
      return { success: true, message: `Conexión exitosa a ${ds.database} en ${ds.host}:${ds.port}` };
    } catch (err: any) {
      this.update(id, { status: 'failed', lastTestedAt: new Date().toISOString() });
      return { success: false, message: `Error de conexión: ${err.message}` };
    }
  }

  // ─── Table introspection ────────────────────────────────────
  async getTables(id: string): Promise<string[]> {
    const ds = this.findOne(id);
    if (ds.engine.toLowerCase().includes('postgres')) {
      return this.getPostgresTables(ds);
    } else if (ds.engine.toLowerCase().includes('mysql')) {
      return this.getMysqlTables(ds);
    }
    return [];
  }

  async getTableColumns(id: string, tableName: string): Promise<TableColumn[]> {
    const ds = this.findOne(id);
    if (ds.engine.toLowerCase().includes('postgres')) {
      return this.getPostgresColumns(ds, tableName);
    } else if (ds.engine.toLowerCase().includes('mysql')) {
      return this.getMysqlColumns(ds, tableName);
    }
    return [];
  }

  // ─── PostgreSQL helpers ─────────────────────────────────────
  private async testPostgres(ds: Datasource): Promise<void> {
    const { Client } = await import('pg');
    const client = new Client({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.end();
  }

  private async getPostgresTables(ds: Datasource): Promise<string[]> {
    const { Client } = await import('pg');
    const client = new Client({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database, connectionTimeoutMillis: 5000 });
    await client.connect();
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
    await client.end();
    return res.rows.map((r: any) => r.table_name);
  }

  private async getPostgresColumns(ds: Datasource, table: string): Promise<TableColumn[]> {
    const { Client } = await import('pg');
    const client = new Client({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database, connectionTimeoutMillis: 5000 });
    await client.connect();
    const res = await client.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table],
    );
    await client.end();
    return res.rows.map((r: any) => ({ name: r.column_name, type: sqlTypeToTs(r.data_type), nullable: r.is_nullable === 'YES' }));
  }

  // ─── MySQL helpers ──────────────────────────────────────────
  private async testMysql(ds: Datasource): Promise<void> {
    const mysql = await import('mysql2/promise');
    const conn = await mysql.createConnection({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database, connectTimeout: 5000 });
    await conn.end();
  }

  private async getMysqlTables(ds: Datasource): Promise<string[]> {
    const mysql = await import('mysql2/promise');
    const conn = await mysql.createConnection({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database });
    const [rows] = await conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`, [ds.database]) as any[];
    await conn.end();
    return rows.map((r: any) => r.table_name ?? r.TABLE_NAME);
  }

  private async getMysqlColumns(ds: Datasource, table: string): Promise<TableColumn[]> {
    const mysql = await import('mysql2/promise');
    const conn = await mysql.createConnection({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database });
    const [rows] = await conn.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`, [ds.database, table]) as any[];
    await conn.end();
    return rows.map((r: any) => ({ name: r.column_name ?? r.COLUMN_NAME, type: sqlTypeToTs(r.data_type ?? r.DATA_TYPE), nullable: (r.is_nullable ?? r.IS_NULLABLE) === 'YES' }));
  }
}
