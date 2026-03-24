export interface GenField { name: string; type: string; nullable: boolean; isPk: boolean; }
export interface GenEntity { name: string; tableName: string; schema?: string; fields: GenField[]; }
export interface DbEngineInfo { engine: string; instanceName?: string; }
