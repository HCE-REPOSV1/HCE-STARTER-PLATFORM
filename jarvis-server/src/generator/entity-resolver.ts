import { Logger } from '@nestjs/common';
import type { Domain } from '../domains/domain.interface';
import type { DatasourceService } from '../datasource/datasource.service';
import type { GenerateDto } from './generator.interface';
import type { GenField, GenEntity } from './gen-entity.interface';

export class EntityResolver {
  private static readonly logger = new Logger(EntityResolver.name);

  constructor(private readonly datasourceService: DatasourceService) {}

  async resolve(dto: GenerateDto, domain: Domain): Promise<GenEntity[]> {
    if (dto.orm === 'typeorm' && dto.selectedTables?.length && dto.datasourceId) {
      return this.resolveFromDatabase(dto);
    }
    return this.resolveFromDomain(domain);
  }

  private async resolveFromDatabase(dto: GenerateDto): Promise<GenEntity[]> {
    const entities: GenEntity[] = [];
    for (const table of dto.selectedTables!) {
      const columns = await this.datasourceService.getTableColumns(dto.datasourceId!, table);
      entities.push({
        name:      this.tableToEntityName(table),
        tableName: table,
        fields:    columns.map((c): GenField => ({ name: c.name, type: c.type, nullable: c.nullable, isPk: c.name === 'id' })),
      });
    }
    EntityResolver.logger.log(`Resolved ${entities.length} entities from database for datasource ${dto.datasourceId}`);
    return entities;
  }

  private resolveFromDomain(domain: Domain): GenEntity[] {
    return domain.entities.map(e => ({
      name:      e.name,
      tableName: `${e.name}s`,
      schema:    domain.schema || undefined,
      fields:    e.fields.map((f): GenField => ({ name: f.name, type: f.type, nullable: !f.required, isPk: f.name === 'id' })),
    }));
  }

  private tableToEntityName(table: string): string {
    return table
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, c => c.toUpperCase());
  }
}
