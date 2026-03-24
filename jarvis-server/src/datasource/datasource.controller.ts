import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DatasourceService } from './datasource.service';
import type { Datasource } from './datasource.interface';
import { LogsService } from '../logs/logs.service';

@Controller('datasources')
export class DatasourceController {
  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  findAll() { return this.datasourceService.findAll(); }

  @Post()
  create(@Body() body: Omit<Datasource, 'id'>) {
    const result = this.datasourceService.create(body);
    this.logsService.add('admin', 'CREATE_DATASOURCE', { id: result.id, database: result.database });
    return result;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Datasource>) {
    const result = this.datasourceService.update(id, body);
    this.logsService.add('admin', 'UPDATE_DATASOURCE', { id });
    return result;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logsService.add('admin', 'DELETE_DATASOURCE', { id });
    return this.datasourceService.remove(id);
  }

  // Real connection test (PostgreSQL / MySQL)
  @Post(':id/test')
  async testConnection(@Param('id') id: string) {
    const result = await this.datasourceService.testConnection(id);
    this.logsService.add('admin', 'TEST_DATASOURCE', { id, success: result.success });
    return result;
  }

  // Introspect tables from the database
  @Get(':id/tables')
  async getTables(@Param('id') id: string) {
    return this.datasourceService.getTables(id);
  }

  // Get columns for a specific table
  @Get(':id/tables/:table/columns')
  async getColumns(@Param('id') id: string, @Param('table') table: string) {
    return this.datasourceService.getTableColumns(id, table);
  }
}
