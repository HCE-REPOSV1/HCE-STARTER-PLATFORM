// logs.controller.ts — Expone GET /logs con filtros
import { Controller, Get, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import type { LogFilters } from './log.interface';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(@Query() query: LogFilters) {
    return this.logsService.findAll(query);
  }
}
