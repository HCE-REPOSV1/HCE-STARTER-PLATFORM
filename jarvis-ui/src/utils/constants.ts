// src/utils/constants.ts — Constantes compartidas entre páginas del frontend

export const FIELD_TYPES = ['string', 'number', 'boolean', 'Date'] as const;
export type FieldType = typeof FIELD_TYPES[number];

export const ARCHITECTURE_OPTIONS = [
  { value: 'hexagonal', label: 'Hexagonal', desc: 'Ports & Adapters — máxima separación' },
  { value: 'clean',     label: 'Clean',     desc: 'Clean Architecture — capas independientes' },
  { value: 'layered',   label: 'Layered',   desc: 'Capas tradicionales — más simple' },
] as const;

export const ORM_OPTIONS = [
  { value: 'none',    label: 'Sin ORM', desc: 'Repositorios manuales' },
  { value: 'typeorm', label: 'TypeORM', desc: 'ORM clásico para NestJS' },
  { value: 'prisma',  label: 'Prisma',  desc: 'ORM moderno con schema' },
] as const;

export const AUTH_TYPE_OPTIONS = [
  { value: 'none',  label: 'Sin Auth', desc: 'Endpoints públicos' },
  { value: 'jwt',   label: 'JWT',      desc: 'Bearer token stateless' },
  { value: 'oauth', label: 'OAuth2',   desc: 'Delegación de identidad' },
] as const;

export const DB_ENGINE_OPTIONS = [
  { value: 'PostgreSQL',  label: 'PostgreSQL' },
  { value: 'MySQL',       label: 'MySQL' },
  { value: 'SQL Server',  label: 'SQL Server' },
] as const;

export const USER_ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'DEV',   label: 'DEV' },
] as const;

export const TEMPLATE_TYPES = ['nestjs', 'react', 'openapi', 'docker', 'readme'] as const;
export type TemplateType = typeof TEMPLATE_TYPES[number];

export const TEMPLATE_TYPE_OPTIONS = TEMPLATE_TYPES.map((t) => ({ value: t, label: t }));

export const LOG_LEVEL_OPTIONS = [
  { value: '',      label: 'Todos' },
  { value: 'INFO',  label: 'INFO' },
  { value: 'WARN',  label: 'WARN' },
  { value: 'ERROR', label: 'ERROR' },
] as const;

export const MODULE_OPTIONS = [
  { value: '', label: 'Todos' },
  ...['auth', 'users', 'datasources', 'domains', 'generator', 'templates', 'system'].map((m) => ({ value: m, label: m })),
];

export const GENERATION_STATUS_BADGE: Record<string, 'success' | 'error' | 'warning'> = {
  success: 'success',
  failed: 'error',
  pending: 'warning',
};

export const LOG_LEVEL_BADGE: Record<string, 'info' | 'error' | 'warning'> = {
  INFO: 'info',
  ERROR: 'error',
  WARN: 'warning',
};

export const TEMPLATE_TYPE_BADGE_MAP: Record<string, 'primary' | 'info' | 'warning' | 'success' | 'neutral'> = {
  nestjs:  'primary',
  react:   'info',
  openapi: 'warning',
  docker:  'success',
  readme:  'neutral',
};

export const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'var(--jarvis-success)',
  LOGOUT: 'var(--jarvis-text-secondary)',
  CREATE_DATASOURCE: 'var(--jarvis-primary)',
  UPDATE_DATASOURCE: 'var(--jarvis-warning)',
  DELETE_DATASOURCE: 'var(--jarvis-error)',
  TEST_DATASOURCE: 'var(--jarvis-info)',
  CREATE_DOMAIN: 'var(--jarvis-primary)',
  UPDATE_DOMAIN: 'var(--jarvis-warning)',
  DELETE_DOMAIN: 'var(--jarvis-error)',
  GENERATE_MICROSERVICE: 'var(--jarvis-navy)',
  GENERATE_MICROSERVICE_FAILED: 'var(--jarvis-error)',
  CREATE_USER: 'var(--jarvis-primary)',
  UPDATE_USER: 'var(--jarvis-warning)',
  DELETE_USER: 'var(--jarvis-error)',
};
