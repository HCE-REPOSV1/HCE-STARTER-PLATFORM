export interface GatewayService { name: string; url: string; protected: boolean; }

export interface GenerateDto {
  name: string;
  type: 'UX' | 'CN' | 'BS' | 'AG' | 'AA';
  domainId: string;
  datasourceId?: string;
  selectedTables?: string[];
  architecture?: 'hexagonal' | 'clean' | 'layered';
  orm?: 'typeorm' | 'prisma' | 'none';
  apiStyle?: 'rest' | 'graphql';
  authType?: 'none' | 'jwt' | 'oauth';
  observability?: { logs: boolean; metrics: boolean; tracing: boolean };
  gitEnabled?: boolean;
  gitRepoUrl?: string;
  gitBranch?: string;
  // AG — API Gateway
  gatewayServices?: GatewayService[];
  rateLimitTtl?: number;
  rateLimitMax?: number;
  requestTimeout?: number;
  allowedOrigins?: string;
  useSsl?: boolean;
  sslPort?: number;
  serverName?: string;
  certPath?: string;
  // AA — Auth Service
  authUser?: string;
  authPassword?: string;
  jwtExpiresIn?: string;
  jwtRefreshExpiresIn?: string;
}
