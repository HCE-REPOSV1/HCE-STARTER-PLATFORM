import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { GenerationConfigService } from './generation-config.service';
import type { GenerationConfig } from './generation-config.interface';

@Controller('generation-configs')
export class GenerationConfigController {
  constructor(private readonly service: GenerationConfigService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() body: Omit<GenerationConfig, 'id' | 'createdAt'>) { return this.service.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<GenerationConfig>) { return this.service.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
