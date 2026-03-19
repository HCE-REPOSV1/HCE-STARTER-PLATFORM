import { Controller, Delete, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { GenerationsService } from './generations.service';

@Controller('generations')
export class GenerationsController {
  constructor(private readonly generationsService: GenerationsService) {}

  @Get()
  findAll() { return this.generationsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.generationsService.findOne(id); }

  // Re-download ZIP if still available in temp
  @Get(':id/download')
  download(@Param('id') id: string, @Res() res: Response) {
    const gen = this.generationsService.findOne(id);
    if (!gen.zipPath || !fs.existsSync(gen.zipPath)) {
      res.status(410).json({ message: 'El archivo ZIP ya no está disponible. Regenere el microservicio.' });
      return;
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${gen.serviceName}.zip"`);
    res.sendFile(gen.zipPath);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.generationsService.remove(id); }
}
