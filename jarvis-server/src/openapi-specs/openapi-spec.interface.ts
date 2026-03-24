export interface OpenApiSpec {
  id: string;
  name: string;
  domainId: string;
  domainName: string;
  selectedEntities: string[];
  yaml: string;
  createdAt: string;
}

export interface CreateOpenApiSpecDto {
  name: string;
  domainId: string;
  selectedEntities: string[];
}
