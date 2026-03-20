import { Module } from '@nestjs/common';
import { OpenApiSpecsController } from './openapi-specs.controller';
import { OpenApiSpecsService } from './openapi-specs.service';
import { DomainsModule } from '../domains/domains.module';

@Module({
  imports: [DomainsModule],
  controllers: [OpenApiSpecsController],
  providers: [OpenApiSpecsService],
  exports: [OpenApiSpecsService],
})
export class OpenApiSpecsModule {}
