// logs.module.ts — Global: LogsService disponible en todos los módulos sin importar
import { Global, Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';

@Global()
@Module({
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
