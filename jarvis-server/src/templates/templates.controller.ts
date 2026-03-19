import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import type { Template, TemplateType } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@Query('type') type?: TemplateType) {
    return type ? this.templatesService.findByType(type) : this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.templatesService.findOne(id); }

  @Post()
  create(@Body() body: Omit<Template, 'id' | 'createdAt'>) { return this.templatesService.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Template>) { return this.templatesService.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.templatesService.remove(id); }
}
