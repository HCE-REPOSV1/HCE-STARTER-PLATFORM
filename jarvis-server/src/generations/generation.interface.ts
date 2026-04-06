export type GenerationStatus = 'success' | 'failed' | 'pending';

export interface Generation {
  id: string;
  serviceName: string;
  type: 'UX' | 'CN' | 'BS' | 'AG' | 'AA' | 'LG';
  domainId: string;
  domainName: string;
  architecture: string;
  orm: string;
  status: GenerationStatus;
  zipPath?: string;       // absolute path to ZIP in temp dir
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
}
