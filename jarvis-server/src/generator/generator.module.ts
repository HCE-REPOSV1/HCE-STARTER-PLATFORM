import { Module } from '@nestjs/common';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { DomainsModule } from '../domains/domains.module';
import { DatasourceModule } from '../datasource/datasource.module';
import { GenerationsModule } from '../generations/generations.module';

@Module({
  imports: [DomainsModule, DatasourceModule, GenerationsModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
})
export class GeneratorModule {}
