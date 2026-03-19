// Shared types — mirrors backend interfaces
export interface EntityField { name: string; type: string; required: boolean }
export interface DomainEntity { name: string; fields: EntityField[] }
export interface Domain { id: string; name: string; entities: DomainEntity[]; datasourceId?: string }

export interface Datasource {
  id: string; engine: string; host: string; port: number;
  username: string; password: string; database: string; npmLibrary: string;
  status?: 'active' | 'failed' | 'untested'; lastTestedAt?: string;
}

export interface User { id: string; username: string; role: 'ADMIN' | 'DEV'; active: boolean; createdAt: string }

export interface Template {
  id: string; name: string; type: string; version: string;
  description: string; path: string; active: boolean; createdAt: string;
}

export interface Generation {
  id: string; serviceName: string; type: 'UX' | 'CN' | 'BS';
  domainId: string; domainName: string; architecture: string; orm: string;
  status: 'success' | 'failed' | 'pending'; zipPath?: string;
  errorMessage?: string; createdBy: string; createdAt: string;
}

export interface LogEntry {
  timestamp: string; user: string; action: string;
  module: string; level: 'INFO' | 'ERROR' | 'WARN'; details: Record<string, any>;
}

export interface GenerateDto {
  name: string; type: 'UX' | 'CN' | 'BS'; domainId: string; datasourceId?: string;
  architecture?: 'hexagonal' | 'clean' | 'layered';
  orm?: 'typeorm' | 'prisma' | 'none';
  apiStyle?: 'rest' | 'graphql';
  authType?: 'none' | 'jwt' | 'oauth';
  observability?: { logs: boolean; metrics: boolean; tracing: boolean };
  gitEnabled?: boolean; gitRepoUrl?: string; gitBranch?: string;
}
