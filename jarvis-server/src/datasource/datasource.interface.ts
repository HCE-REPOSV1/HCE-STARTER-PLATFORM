export interface Datasource {
  id: string;
  engine: string;       // PostgreSQL | MySQL | SQL Server
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema?: string;        // DB schema (dbo for SQL Server, public for PostgreSQL)
  instanceName?: string;  // SQL Server: nombre de instancia (ej: INST01)
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
