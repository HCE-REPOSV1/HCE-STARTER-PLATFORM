import { Module } from '@nestjs/common';
import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { GeneratorFactory } from './generator.factory';
import { UxStrategy  } from './strategies/ux.strategy';
import { BffStrategy } from './strategies/bff.strategy';
import { AgStrategy  } from './strategies/ag.strategy';
import { AaStrategy  } from './strategies/aa.strategy';
import { LgStrategy  } from './strategies/lg.strategy';
import { MsStrategy  } from './strategies/ms.strategy';
import { DomainsModule } from '../domains/domains.module';
import { DatasourceModule } from '../datasource/datasource.module';
import { GenerationsModule } from '../generations/generations.module';

@Module({
  imports: [DomainsModule, DatasourceModule, GenerationsModule],
  controllers: [GeneratorController],
  providers: [
    UxStrategy,
    BffStrategy,
    AgStrategy,
    AaStrategy,
    LgStrategy,
    MsStrategy,
    GeneratorFactory,
    GeneratorService,
  ],
})
export class GeneratorModule {}
