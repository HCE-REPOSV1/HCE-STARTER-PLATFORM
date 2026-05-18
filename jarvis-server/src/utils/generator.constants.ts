export const TYPE_PREFIX: Record<string, string> = {
  UX: 'ds',
  CN: 'ms-cn',
  BS: 'ms-bs',
  AG: 'gw',
  AA: 'auth',
  LG: 'ms-lg',
  MS: 'ms-media',
};

export const TYPES_WITHOUT_DOMAIN = ['AG', 'AA', 'LG', 'MS'] as const;

export const DEFAULT_ARCHITECTURE = 'hexagonal' as const;
export const DEFAULT_ORM = 'none' as const;
export const DEFAULT_DB_ENGINE = 'postgres' as const;

export const ARCH_FOLDERS: Record<string, string[]> = {
  layered: ['src/controllers', 'src/services', 'src/entities', 'src/dto'],
  hexagonal: [
    'src/domain/entities',
    'src/domain/repositories',
    'src/application/use-cases',
    'src/infrastructure/controllers',
    'src/infrastructure/persistence',
    'src/dto',
  ],
};
