import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OpenApiSpecsService } from './openapi-specs.service';
import type { CreateOpenApiSpecDto } from './openapi-specs.service';
import { LogsService } from '../logs/logs.service';

@Controller('openapi-specs')
export class OpenApiSpecsController {
  constructor(
    private readonly openApiSpecsService: OpenApiSpecsService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  findAll() {
    this.logsService.add('admin', 'LIST_OPENAPI_SPECS', {});
    return this.openApiSpecsService.findAll();
  }

  @Post()
  create(@Body() body: CreateOpenApiSpecDto) {
    const result = this.openApiSpecsService.create(body);
    this.logsService.add('admin', 'CREATE_OPENAPI_SPEC', { name: result.name, domainId: result.domainId });
    return result;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logsService.add('admin', 'GET_OPENAPI_SPEC', { id });
    return this.openApiSpecsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logsService.add('admin', 'DELETE_OPENAPI_SPEC', { id });
    return this.openApiSpecsService.remove(id);
  }

  @Get(':id/download')
  download(@Param('id') id: string, @Res() res: Response) {
    const spec = this.openApiSpecsService.findOne(id);
    this.logsService.add('admin', 'DOWNLOAD_OPENAPI_SPEC', { id, name: spec.name });
    const filename = `${spec.name.toLowerCase().replace(/\s+/g, '-')}-openapi.yaml`;
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(spec.yaml);
  }
}
