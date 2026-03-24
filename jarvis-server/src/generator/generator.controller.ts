import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GeneratorService } from './generator.service';
import type { GenerateDto } from './generator.interface';
import { LogsService } from '../logs/logs.service';
import { GenerationsService } from '../generations/generations.service';

@Controller('generate')
export class GeneratorController {
  constructor(
    private readonly generatorService:  GeneratorService,
    private readonly logsService:       LogsService,
    private readonly generationsService: GenerationsService,
  ) {}

  @Post()
  async generate(@Body() dto: GenerateDto, @Res() res: Response) {
    const gen = this.generationsService.record({
      serviceName: `${dto.type.toLowerCase()}-${dto.name}`,
      type:        dto.type,
      domainId:    dto.domainId ?? '',
      domainName:  dto.domainId ?? dto.type,
      architecture: dto.architecture ?? 'hexagonal',
      orm:          dto.orm          ?? 'none',
      status:       'pending',
      createdBy:    'admin',
    });

    try {
      const { zipPath, serviceName, domainName } = await this.generatorService.generate(dto);

      this.generationsService.updateStatus(gen.id, 'success', zipPath);
      this.logsService.add('admin', 'GENERATE_MICROSERVICE', { serviceName, type: dto.type, architecture: dto.architecture });

      // Patch domainName now that we have it
      this.generationsService.updateStatus(gen.id, 'success', zipPath);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${serviceName}.zip"`);
      res.setHeader('X-Generation-Id', gen.id);
      res.setHeader('X-Domain-Name', domainName);
      res.sendFile(zipPath);
    } catch (err: any) {
      this.generationsService.updateStatus(gen.id, 'failed', undefined, err.message);
      this.logsService.add('admin', 'GENERATE_MICROSERVICE_FAILED', { name: dto.name, error: err.message });
      res.status(500).json({ message: 'Error al generar el microservicio', error: err.message });
    }
  }
}
