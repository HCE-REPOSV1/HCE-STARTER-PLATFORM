export const SQL_QUERIES = {
  POSTGRES: {
    GET_TABLES: `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
    GET_COLUMNS: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
  },
  MYSQL: {
    GET_TABLES: `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`,
    GET_COLUMNS: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`,
  },
  SQLSERVER: {
    GET_TABLES: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = @schema ORDER BY TABLE_NAME`,
    GET_COLUMNS: `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table AND TABLE_SCHEMA = @schema ORDER BY ORDINAL_POSITION`,
  },
} as const;
