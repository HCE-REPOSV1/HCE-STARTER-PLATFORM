import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatasourceModule } from './datasource/datasource.module';
import { DomainsModule } from './domains/domains.module';
import { GeneratorModule } from './generator/generator.module';
import { LogsModule } from './logs/logs.module';
import { UsersModule } from './users/users.module';
import { TemplatesModule } from './templates/templates.module';
import { GenerationsModule } from './generations/generations.module';
import { GenerationConfigModule } from './generation-config/generation-config.module';
import { OpenApiSpecsModule } from './openapi-specs/openapi-specs.module';

@Module({
  imports: [
    LogsModule,           // Global — must be first
    AuthModule,
    UsersModule,
    DatasourceModule,
    DomainsModule,
    GeneratorModule,
    TemplatesModule,
    GenerationsModule,
    GenerationConfigModule,
    OpenApiSpecsModule,
  ],
})
export class AppModule {}
