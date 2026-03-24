export type TemplateType = 'nestjs' | 'react' | 'openapi' | 'docker' | 'readme';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  version: string;
  description: string;
  path: string;       // relative path inside /templates folder
  active: boolean;
  createdAt: string;
}
