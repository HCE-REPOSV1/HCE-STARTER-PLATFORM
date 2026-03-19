import { Module } from '@nestjs/common';
import { GenerationConfigController } from './generation-config.controller';
import { GenerationConfigService } from './generation-config.service';

@Module({
  controllers: [GenerationConfigController],
  providers: [GenerationConfigService],
  exports: [GenerationConfigService],
})
export class GenerationConfigModule {}
