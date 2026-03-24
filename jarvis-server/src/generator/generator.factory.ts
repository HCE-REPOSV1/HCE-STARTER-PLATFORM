import { Injectable } from '@nestjs/common';
import type { IGeneratorStrategy } from './strategies/strategy.base';
import { UxStrategy  } from './strategies/ux.strategy';
import { BffStrategy } from './strategies/bff.strategy';
import { AgStrategy  } from './strategies/ag.strategy';
import { AaStrategy  } from './strategies/aa.strategy';

@Injectable()
export class GeneratorFactory {
  private readonly map: Record<string, IGeneratorStrategy>;

  constructor(
    private readonly ux:  UxStrategy,
    private readonly bff: BffStrategy,
    private readonly ag:  AgStrategy,
    private readonly aa:  AaStrategy,
  ) {
    this.map = {
      UX: this.ux,
      CN: this.bff,
      BS: this.bff,
      AG: this.ag,
      AA: this.aa,
    };
  }

  getStrategy(type: string): IGeneratorStrategy {
    return this.map[type] ?? this.bff;
  }
}
