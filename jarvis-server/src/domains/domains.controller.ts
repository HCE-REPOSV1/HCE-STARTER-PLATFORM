import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DomainsService } from './domains.service';
import type { Domain } from './domain.interface';
import { LogsService } from '../logs/logs.service';

@Controller('domains')
export class DomainsController {
  constructor(
    private readonly domainsService: DomainsService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  findAll() {
    return this.domainsService.findAll();
  }

  @Post()
  create(@Body() body: Omit<Domain, 'id'>) {
    const result = this.domainsService.create(body);
    this.logsService.add('admin', 'CREATE_DOMAIN', { name: result.name });
    return result;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Domain>) {
    const result = this.domainsService.update(id, body);
    this.logsService.add('admin', 'UPDATE_DOMAIN', { id });
    return result;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logsService.add('admin', 'DELETE_DOMAIN', { id });
    return this.domainsService.remove(id);
  }
}
