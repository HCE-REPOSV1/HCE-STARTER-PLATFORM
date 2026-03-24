export interface EntityField {
  name: string;
  type: string;
  required: boolean;
}

export interface DomainEntity {
  name: string;
  fields: EntityField[];
}

export interface Domain {
  id: string;
  name: string;
  schema?: string;
  entities: DomainEntity[];
  datasourceId?: string;
}
