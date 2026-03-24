import { Logger } from '@nestjs/common';
import type { DatasourceService } from '../datasource/datasource.service';
import type { GenerateDto } from './generator.interface';
import type { DbEngineInfo } from './gen-entity.interface';

export class DbEngineResolver {
  private static readonly logger = new Logger(DbEngineResolver.name);

  constructor(private readonly datasourceService: DatasourceService) {}

  resolve(dto: GenerateDto): DbEngineInfo {
    if (!dto.datasourceId) return { engine: 'postgres' };
    try {
      const ds = this.datasourceService.findOne(dto.datasourceId);
      const e  = ds.engine.toLowerCase();
      if (e.includes('mysql'))                                  return { engine: 'mysql' };
      if (e.includes('sql server') || e.includes('mssql'))     return { engine: 'mssql', instanceName: ds.instanceName };
      return { engine: 'postgres' };
    } catch (err: any) {
      DbEngineResolver.logger.warn(`Could not resolve DB engine for datasourceId "${dto.datasourceId}": ${err.message}`);
      return { engine: 'postgres' };
    }
  }
}
