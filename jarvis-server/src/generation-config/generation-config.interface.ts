export type Architecture = 'hexagonal' | 'clean' | 'layered';
export type OrmType = 'typeorm' | 'prisma' | 'none';
export type ApiStyle = 'rest' | 'graphql';
export type AuthType = 'none' | 'jwt' | 'oauth';

export interface Observability {
  logs: boolean;
  metrics: boolean;
  tracing: boolean;
}

export interface GenerationConfig {
  id: string;
  name: string;
  version: string;
  architecture: Architecture;
  orm: OrmType;
  apiStyle: ApiStyle;
  authType: AuthType;
  observability: Observability;
  gitEnabled: boolean;
  gitRepoUrl?: string;
  gitBranch: string;
  datasourceId?: string;
  domainId?: string;
  createdBy: string;
  createdAt: string;
}
