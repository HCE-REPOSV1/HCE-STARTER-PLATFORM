import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Domain } from '../../domains/domain.interface';
import type { GenerateDto } from '../generator.interface';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class UxStrategy extends GeneratorStrategyBase {
  async generate(dir: string, name: string, _dto: GenerateDto, domain?: Domain): Promise<void> {
    const d = domain!;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildOpenApiSpec(name, d));
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildReadme(name, d, 'UX', {}));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name, version: '1.0.0',
        scripts: { mock: 'prism mock openapi.yaml', validate: 'swagger-cli validate openapi.yaml' },
        devDependencies: { '@stoplight/prism-cli': 'latest', 'swagger-cli': 'latest' },
      }, null, 2),
    );
  }
}
