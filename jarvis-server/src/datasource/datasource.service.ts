// datasource.service.ts — CRUD + introspección real de base de datos
// Soporta PostgreSQL (pg) y MySQL (mysql2) para listar tablas y columnas.
import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SQL_QUERIES } from '../utils/sql-queries.constants';
import { Datasource, TableColumn, TableInfo } from './datasource.interface';

// Map SQL types to TypeScript types (PostgreSQL, MySQL, SQL Server)
const SQL_TO_TS: Record<string, string> = {
  // Numeric
  int: 'number', integer: 'number', bigint: 'number', smallint: 'number', tinyint: 'number',
  numeric: 'number', decimal: 'number', float: 'number', double: 'number', real: 'number', money: 'number', smallmoney: 'number',
  // String
  varchar: 'string', char: 'string', text: 'string', uuid: 'string',
  'character varying': 'string', 'character': 'string',
  nvarchar: 'string', nchar: 'string', ntext: 'string',       // SQL Server unicode
  uniqueidentifier: 'string',                                   // SQL Server UUID
  // Boolean
  boolean: 'boolean', bool: 'boolean', bit: 'boolean',         // SQL Server bit
  // Date
  date: 'Date', timestamp: 'Date', datetime: 'Date', datetime2: 'Date', smalldatetime: 'Date',
  'timestamp without time zone': 'Date', 'timestamp with time zone': 'Date',
  datetimeoffset: 'Date',                                       // SQL Server timezone-aware
  // JSON
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
      } else if (this.isSqlServer(ds.engine)) {
        await this.testSqlServer(ds);
      } else {
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
    } else if (this.isSqlServer(ds.engine)) {
      return this.getSqlServerTables(ds);
    }
    return [];
  }

  async getTableColumns(id: string, tableName: string): Promise<TableColumn[]> {
    const ds = this.findOne(id);
    if (ds.engine.toLowerCase().includes('postgres')) {
      return this.getPostgresColumns(ds, tableName);
    } else if (ds.engine.toLowerCase().includes('mysql')) {
      return this.getMysqlColumns(ds, tableName);
    } else if (this.isSqlServer(ds.engine)) {
      return this.getSqlServerColumns(ds, tableName);
    }
    return [];
  }

  private isSqlServer(engine: string): boolean {
    const e = engine.toLowerCase();
    return e.includes('sql server') || e.includes('mssql') || e.includes('sqlserver');
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
    const schema = ds.schema ?? 'public';
    const res = await client.query(
      SQL_QUERIES.POSTGRES.GET_TABLES,
      [schema],
    );
    await client.end();
    return res.rows.map((r: any) => r.table_name);
  }

  private async getPostgresColumns(ds: Datasource, table: string): Promise<TableColumn[]> {
    const { Client } = await import('pg');
    const client = new Client({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database, connectionTimeoutMillis: 5000 });
    await client.connect();
    const schema = ds.schema ?? 'public';
    const res = await client.query(
      SQL_QUERIES.POSTGRES.GET_COLUMNS,
      [schema, table],
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
    const [rows] = await conn.query(SQL_QUERIES.MYSQL.GET_TABLES, [ds.database]) as any[];
    await conn.end();
    return rows.map((r: any) => r.table_name ?? r.TABLE_NAME);
  }

  private async getMysqlColumns(ds: Datasource, table: string): Promise<TableColumn[]> {
    const mysql = await import('mysql2/promise');
    const conn = await mysql.createConnection({ host: ds.host, port: ds.port, user: ds.username, password: ds.password, database: ds.database });
    const [rows] = await conn.query(SQL_QUERIES.MYSQL.GET_COLUMNS, [ds.database, table]) as any[];
    await conn.end();
    return rows.map((r: any) => ({ name: r.column_name ?? r.COLUMN_NAME, type: sqlTypeToTs(r.data_type ?? r.DATA_TYPE), nullable: (r.is_nullable ?? r.IS_NULLABLE) === 'YES' }));
  }

  // ─── SQL Server helpers ─────────────────────────────────────
  private buildMssqlConfig(ds: Datasource) {
    return {
      server: ds.host,
      port: ds.port,
      user: ds.username,
      password: ds.password,
      database: ds.database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 5000,
        instanceName: ds.instanceName || undefined,
      },
    };
  }

  // mssql v11 usa ConnectionPool, no mssql.connect() directamente
  // El dynamic import en CommonJS puede devolver el módulo en .default
  private async getMssqlPool(ds: Datasource) {
    const mod = await import('mssql');
    const sql = (mod as any).default ?? mod;
    const pool = new sql.ConnectionPool(this.buildMssqlConfig(ds));
    await pool.connect();
    return pool;
  }

  private async testSqlServer(ds: Datasource): Promise<void> {
    const pool = await this.getMssqlPool(ds);
    await pool.close();
  }

  private async getSqlServerTables(ds: Datasource): Promise<string[]> {
    const pool = await this.getMssqlPool(ds);
    const mod = await import('mssql');
    const sql = (mod as any).default ?? mod;
    const result = await pool.request()
      .input('schema', sql.NVarChar, ds.schema ?? 'dbo')
      .query(SQL_QUERIES.SQLSERVER.GET_TABLES);
    await pool.close();
    return result.recordset.map((r: any) => r.TABLE_NAME);
  }

  private async getSqlServerColumns(ds: Datasource, table: string): Promise<TableColumn[]> {
    const pool = await this.getMssqlPool(ds);
    const mod = await import('mssql');
    const sql = (mod as any).default ?? mod;
    const result = await pool.request()
      .input('table', sql.NVarChar, table)
      .input('schema', sql.NVarChar, ds.schema ?? 'dbo')
      .query(SQL_QUERIES.SQLSERVER.GET_COLUMNS);
    await pool.close();
    return result.recordset.map((r: any) => ({
      name: r.COLUMN_NAME,
      type: sqlTypeToTs(r.DATA_TYPE),
      nullable: r.IS_NULLABLE === 'YES',
    }));
  }
}
