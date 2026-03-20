import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GeneratorService } from './generator.service';
import type { GenerateDto } from './generator.service';
import { LogsService } from '../logs/logs.service';
import { GenerationsService } from '../generations/generations.service';
import { DomainsService } from '../domains/domains.service';

@Controller('generate')
export class GeneratorController {
  constructor(
    private readonly generatorService: GeneratorService,
    private readonly logsService: LogsService,
    private readonly generationsService: GenerationsService,
    private readonly domainsService: DomainsService,
  ) {}

  @Post()
  async generate(@Body() dto: GenerateDto, @Res() res: Response) {
    const needsDomain = dto.type !== 'AG' && dto.type !== 'AA';
    const domain = needsDomain ? this.domainsService.findOne(dto.domainId) : null;

    // Record generation attempt
    const gen = this.generationsService.record({
      serviceName: `${dto.type.toLowerCase()}-${dto.name}`,
      type: dto.type,
      domainId: dto.domainId ?? '',
      domainName: domain?.name ?? dto.type,
      architecture: dto.architecture ?? 'hexagonal',
      orm: dto.orm ?? 'none',
      status: 'pending',
      createdBy: 'admin',
    });

    try {
      const { zipPath, serviceName } = await this.generatorService.generate(dto);

      // Update history with success + zip path
      this.generationsService.updateStatus(gen.id, 'success', zipPath);
      this.logsService.add('admin', 'GENERATE_MICROSERVICE', { serviceName, type: dto.type, architecture: dto.architecture });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${serviceName}.zip"`);
      res.setHeader('X-Generation-Id', gen.id);
      res.sendFile(zipPath);
    } catch (err: any) {
      this.generationsService.updateStatus(gen.id, 'failed', undefined, err.message);
      this.logsService.add('admin', 'GENERATE_MICROSERVICE_FAILED', { name: dto.name, error: err.message });
      res.status(500).json({ message: 'Error al generar el microservicio', error: err.message });
    }
  }
}
