import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import archiver from 'archiver';
import { DomainsService } from '../domains/domains.service';
import { GeneratorFactory } from './generator.factory';
import { TYPE_PREFIX, TYPES_WITHOUT_DOMAIN } from '../utils/generator.constants';
import type { GenerateDto } from './generator.interface';

@Injectable()
export class GeneratorService {
  constructor(
    private readonly factory:       GeneratorFactory,
    private readonly domainsService: DomainsService,
  ) {}

  async generate(dto: GenerateDto): Promise<{ zipPath: string; serviceName: string; domainName: string }> {
    const prefix      = TYPE_PREFIX[dto.type] ?? 'ms-bs';
    const serviceName = `${prefix}-${dto.name.toLowerCase().replace(/\s+/g, '-')}`;
    const tmpDir      = path.join(os.tmpdir(), `jarvis-${Date.now()}`, serviceName);

    const needsDomain = !TYPES_WITHOUT_DOMAIN.includes(dto.type as any);
    const domain      = needsDomain ? this.domainsService.findOne(dto.domainId) : undefined;

    await this.factory.getStrategy(dto.type).generate(tmpDir, serviceName, dto, domain);

    const zipPath = path.join(os.tmpdir(), `${serviceName}.zip`);
    await this.zipDir(tmpDir, zipPath);
    return { zipPath, serviceName, domainName: domain?.name ?? dto.type };
  }

  private zipDir(sourceDir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output  = fs.createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
