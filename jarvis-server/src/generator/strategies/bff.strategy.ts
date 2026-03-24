import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DatasourceService } from '../../datasource/datasource.service';
import type { Domain } from '../../domains/domain.interface';
import type { GenerateDto } from '../generator.interface';
import type { GenEntity } from '../gen-entity.interface';
import { EntityResolver } from '../entity-resolver';
import { DbEngineResolver } from '../db-engine-resolver';
import { DEFAULT_ARCHITECTURE, DEFAULT_ORM, ARCH_FOLDERS } from '../../utils/generator.constants';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class BffStrategy extends GeneratorStrategyBase {
  constructor(private readonly datasourceService: DatasourceService) {
    super();
  }

  async generate(dir: string, name: string, dto: GenerateDto, domain?: Domain): Promise<void> {
    const d   = domain!;
    const arch = dto.architecture ?? DEFAULT_ARCHITECTURE;
    const orm  = dto.orm          ?? DEFAULT_ORM;
    const src  = path.join(dir, 'src');

    const entities = await new EntityResolver(this.datasourceService).resolve(dto, d);
    const { engine: dbEngine, instanceName: dbInstanceName } = new DbEngineResolver(this.datasourceService).resolve(dto);

    const folders = ARCH_FOLDERS[arch] ?? ARCH_FOLDERS['hexagonal'];
    folders.forEach(f => fs.mkdirSync(path.join(dir, f), { recursive: true }));

    for (const entity of entities) {
      if (arch === 'layered') {
        this.writeLayeredEntity(src, entity, orm);
        this.writeLayeredService(src, entity, orm);
        this.writeLayeredController(src, entity, dto.type);
      } else {
        this.writeHexEntity(src, entity, orm);
        this.writeHexRepositoryInterface(src, entity);
        this.writeHexUseCase(src, entity);
        this.writeHexController(src, entity, dto.type);
        if (orm === 'typeorm') this.writeTypeOrmRepositoryImpl(src, entity);
      }
      this.writeDto(src, entity);
    }

    this.writeAppModule(src, entities, dto, arch, orm, dbEngine, dbInstanceName);
    this.writeBffMain(src, name, dto.authType);
    this.writeBffPackageJson(dir, name, dto);
    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));
    fs.writeFileSync(path.join(dir, '.env'), this.buildEnvFile(name, dto));
    fs.writeFileSync(path.join(dir, '.env.example'), this.buildEnvFile(name, dto, true));
    fs.writeFileSync(path.join(dir, 'Dockerfile'), this.buildDockerfile(name));
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildReadme(name, d, dto.type, dto));
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildOpenApiSpec(name, d));
  }

  // ─── Layered: entity ─────────────────────────────────────────
  private writeLayeredEntity(src: string, entity: GenEntity, orm: string): void {
    const E = this.pascal(entity.name);
    let content: string;
    if (orm === 'typeorm') {
      const imports = new Set<string>(['Entity', 'Column']);
      entity.fields.forEach(f => { if (f.isPk) imports.add('PrimaryColumn'); });
      const props      = entity.fields.map(f => this.buildTypeOrmProp(f)).join('\n\n');
      const entityOpts = entity.schema
        ? `{ name: '${entity.tableName}', schema: '${entity.schema}' }`
        : `'${entity.tableName}'`;
      content = `import { ${[...imports].join(', ')} } from 'typeorm';\n\n@Entity(${entityOpts})\nexport class ${E} {\n${props}\n}\n`;
    } else {
      const props = entity.fields.map(f => `  ${f.name}${f.nullable ? '?' : '!'}: ${f.type};`).join('\n');
      content = `export class ${E} {\n${props}\n}\n`;
    }
    fs.writeFileSync(path.join(src, 'entities', `${entity.name}.entity.ts`), content);
  }

  // ─── Layered: service ────────────────────────────────────────
  private writeLayeredService(src: string, entity: GenEntity, orm: string): void {
    const E = this.pascal(entity.name);
    let content: string;
    if (orm === 'typeorm') {
      content = [
        `import { Injectable } from '@nestjs/common';`,
        `import { InjectRepository } from '@nestjs/typeorm';`,
        `import { Repository } from 'typeorm';`,
        `import { ${E} } from '../entities/${entity.name}.entity';`,
        ``,
        `@Injectable()`,
        `export class ${E}Service {`,
        `  constructor(`,
        `    @InjectRepository(${E})`,
        `    private readonly repo: Repository<${E}>,`,
        `  ) {}`,
        ``,
        `  findAll(): Promise<${E}[]> { return this.repo.find(); }`,
        `  findOne(id: string): Promise<${E} | null> { return this.repo.findOne({ where: { id } as any }); }`,
        `  create(data: Partial<${E}>): Promise<${E}> { return this.repo.save(data as ${E}); }`,
        `  async remove(id: string): Promise<void> { await this.repo.delete(id); }`,
        `}`,
        ``,
      ].join('\n');
    } else {
      content = `import { Injectable } from '@nestjs/common';\nimport { ${E} } from '../entities/${entity.name}.entity';\n\n@Injectable()\nexport class ${E}Service {\n  private items: ${E}[] = [];\n  findAll(): ${E}[] { return this.items; }\n  findOne(id: string): ${E} | undefined { return this.items.find(i => i.id === id); }\n  create(data: Partial<${E}>): ${E} { const item = { id: Date.now().toString(), ...data } as ${E}; this.items.push(item); return item; }\n  remove(id: string): void { this.items = this.items.filter(i => i.id !== id); }\n}\n`;
    }
    fs.writeFileSync(path.join(src, 'services', `${entity.name}.service.ts`), content);
  }

  // ─── Layered: controller ─────────────────────────────────────
  private writeLayeredController(src: string, entity: GenEntity, type: string): void {
    const E   = this.pascal(entity.name);
    const tag = type === 'CN' ? '// BFF Canal\n' : '// BFF Negocio\n';
    fs.writeFileSync(
      path.join(src, 'controllers', `${entity.name}.controller.ts`),
      `${tag}import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';\nimport { ${E}Service } from '../services/${entity.name}.service';\nimport { Create${E}Dto } from '../dto/create-${entity.name}.dto';\n\n@Controller('${entity.name}s')\nexport class ${E}Controller {\n  constructor(private readonly service: ${E}Service) {}\n  @Get() findAll() { return this.service.findAll(); }\n  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }\n  @Post() create(@Body() dto: Create${E}Dto) { return this.service.create(dto); }\n  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string) { this.service.remove(id); }\n}\n`,
    );
  }

  // ─── Hexagonal: entity ───────────────────────────────────────
  private writeHexEntity(src: string, entity: GenEntity, orm: string): void {
    const E = this.pascal(entity.name);
    let content: string;
    if (orm === 'typeorm') {
      const imports = new Set<string>(['Entity', 'Column']);
      entity.fields.forEach(f => { if (f.isPk) imports.add('PrimaryColumn'); });
      const props      = entity.fields.map(f => this.buildTypeOrmProp(f)).join('\n\n');
      const entityOpts = entity.schema
        ? `{ name: '${entity.tableName}', schema: '${entity.schema}' }`
        : `'${entity.tableName}'`;
      content = `import { ${[...imports].join(', ')} } from 'typeorm';\n\n@Entity(${entityOpts})\nexport class ${E} {\n${props}\n}\n`;
    } else {
      const props = entity.fields.map(f => `  ${f.name}${f.nullable ? '?' : '!'}: ${f.type};`).join('\n');
      content = `export class ${E} {\n${props}\n}\n`;
    }
    fs.writeFileSync(path.join(src, 'domain/entities', `${entity.name}.entity.ts`), content);
  }

  // ─── Hexagonal: repository interface ─────────────────────────
  private writeHexRepositoryInterface(src: string, entity: GenEntity): void {
    const E = this.pascal(entity.name);
    fs.writeFileSync(
      path.join(src, 'domain/repositories', `${entity.name}.repository.ts`),
      `import { ${E} } from '../entities/${entity.name}.entity';\n\nexport interface ${E}Repository {\n  save(entity: ${E}): Promise<${E}>;\n  findById(id: string): Promise<${E} | null>;\n  findAll(): Promise<${E}[]>;\n  delete(id: string): Promise<void>;\n}\n`,
    );
  }

  // ─── Hexagonal: use case ─────────────────────────────────────
  private writeHexUseCase(src: string, entity: GenEntity): void {
    const E = this.pascal(entity.name);
    fs.writeFileSync(
      path.join(src, 'application/use-cases', `${entity.name}.use-case.ts`),
      `import { ${E} } from '../../domain/entities/${entity.name}.entity';\nimport { ${E}Repository } from '../../domain/repositories/${entity.name}.repository';\n\nexport class ${E}UseCase {\n  constructor(private readonly repo: ${E}Repository) {}\n  findAll(): Promise<${E}[]> { return this.repo.findAll(); }\n  findById(id: string): Promise<${E} | null> { return this.repo.findById(id); }\n  create(data: Partial<${E}>): Promise<${E}> { return this.repo.save(data as ${E}); }\n  delete(id: string): Promise<void> { return this.repo.delete(id); }\n}\n`,
    );
  }

  // ─── Hexagonal: controller ───────────────────────────────────
  private writeHexController(src: string, entity: GenEntity, type: string): void {
    const E   = this.pascal(entity.name);
    const tag = type === 'CN'
      ? '// BFF Canal — orquesta llamadas a servicios externos\n'
      : '// BFF Negocio — aplica reglas de negocio\n';
    fs.writeFileSync(
      path.join(src, 'infrastructure/controllers', `${entity.name}.controller.ts`),
      `${tag}import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';\nimport { Create${E}Dto } from '../../dto/create-${entity.name}.dto';\n\n@Controller('${entity.name}s')\nexport class ${E}Controller {\n  @Get() findAll() { return []; }\n  @Get(':id') findOne(@Param('id') id: string) { return { id }; }\n  @Post() create(@Body() dto: Create${E}Dto) { return dto; }\n  @Put(':id') update(@Param('id') id: string, @Body() dto: Partial<Create${E}Dto>) { return { id, ...dto }; }\n  @Delete(':id') @HttpCode(204) remove(@Param('id') _id: string) {}\n}\n`,
    );
  }

  // ─── TypeORM: repositorio concreto (solo hexagonal) ──────────
  private writeTypeOrmRepositoryImpl(src: string, entity: GenEntity): void {
    const E = this.pascal(entity.name);
    const content = [
      `import { Injectable } from '@nestjs/common';`,
      `import { InjectRepository } from '@nestjs/typeorm';`,
      `import { Repository } from 'typeorm';`,
      `import { ${E} } from '../../domain/entities/${entity.name}.entity';`,
      `import { ${E}Repository } from '../../domain/repositories/${entity.name}.repository';`,
      ``,
      `@Injectable()`,
      `export class ${E}TypeOrmRepository implements ${E}Repository {`,
      `  constructor(`,
      `    @InjectRepository(${E})`,
      `    private readonly repo: Repository<${E}>,`,
      `  ) {}`,
      ``,
      `  findAll(): Promise<${E}[]> { return this.repo.find(); }`,
      `  findById(id: string): Promise<${E} | null> { return this.repo.findOne({ where: { id } as any }); }`,
      `  save(entity: ${E}): Promise<${E}> { return this.repo.save(entity); }`,
      `  async delete(id: string): Promise<void> { await this.repo.delete(id); }`,
      `}`,
      ``,
    ].join('\n');
    fs.writeFileSync(path.join(src, 'infrastructure/persistence', `${entity.name}.typeorm.repository.ts`), content);
  }

  // ─── DTO ─────────────────────────────────────────────────────
  private writeDto(src: string, entity: GenEntity): void {
    const E      = this.pascal(entity.name);
    const fields = entity.fields
      .filter(f => !f.isPk)
      .map(f => `  ${f.name}${f.nullable ? '?' : '!'}: ${f.type};`)
      .join('\n');
    fs.writeFileSync(path.join(src, 'dto', `create-${entity.name}.dto.ts`), `export class Create${E}Dto {\n${fields}\n}\n`);
  }

  // ─── App Module ───────────────────────────────────────────────
  private writeAppModule(
    src: string, entities: GenEntity[], dto: GenerateDto,
    arch: string, orm: string, dbEngine: string, dbInstanceName?: string,
  ): void {
    const isLayered = arch === 'layered';
    const ctrlPath  = isLayered ? './controllers' : './infrastructure/controllers';
    const comment   = dto.type === 'CN' ? '// BFF Canal' : '// BFF Negocio';

    const ctrlImports = entities.map(e =>
      `import { ${this.pascal(e.name)}Controller } from '${ctrlPath}/${e.name}.controller';`
    ).join('\n');
    const controllers = entities.map(e => `${this.pascal(e.name)}Controller`).join(', ');

    if (orm === 'typeorm') {
      const entityPath    = isLayered ? './entities' : './domain/entities';
      const entityImports = entities.map(e =>
        `import { ${this.pascal(e.name)} } from '${entityPath}/${e.name}.entity';`
      ).join('\n');
      const entityList    = entities.map(e => this.pascal(e.name)).join(', ');

      let providerImports: string;
      let providers: string;
      if (isLayered) {
        providerImports = entities.map(e =>
          `import { ${this.pascal(e.name)}Service } from './services/${e.name}.service';`
        ).join('\n');
        providers = entities.map(e => `${this.pascal(e.name)}Service`).join(', ');
      } else {
        providerImports = entities.map(e =>
          `import { ${this.pascal(e.name)}TypeOrmRepository } from './infrastructure/persistence/${e.name}.typeorm.repository';`
        ).join('\n');
        providers = entities.map(e => `${this.pascal(e.name)}TypeOrmRepository`).join(', ');
      }

      const typeOrmFactory = this.buildTypeOrmFactory(dbEngine, dbInstanceName);

      const content = [
        `${comment}`,
        `import { Module } from '@nestjs/common';`,
        `import { ConfigModule, ConfigService } from '@nestjs/config';`,
        `import { TypeOrmModule } from '@nestjs/typeorm';`,
        `import { dbConfig } from './config/db.config';`,
        ctrlImports,
        entityImports,
        providerImports,
        ``,
        `@Module({`,
        `  imports: [`,
        `    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),`,
        `    TypeOrmModule.forRootAsync({`,
        `      imports: [ConfigModule],`,
        `      useFactory: (cfg: ConfigService) => dbConfig(cfg),`,
        `      inject: [ConfigService],`,
        `    }),`,
        `    TypeOrmModule.forFeature([${entityList}]),`,
        `  ],`,
        `  controllers: [${controllers}],`,
        `  providers: [${providers}],`,
        `})`,
        `export class AppModule {}`,
        ``,
      ].join('\n');

      fs.writeFileSync(path.join(src, 'app.module.ts'), content);
      fs.mkdirSync(path.join(src, 'config'), { recursive: true });
      fs.writeFileSync(path.join(src, 'config', 'db.config.ts'), typeOrmFactory);
    } else {
      let svcImports  = '';
      let providerLine = '';
      if (isLayered) {
        svcImports = entities.map(e =>
          `import { ${this.pascal(e.name)}Service } from './services/${e.name}.service';`
        ).join('\n');
        const provs = entities.map(e => `${this.pascal(e.name)}Service`).join(', ');
        providerLine = `  providers: [${provs}],`;
      }
      fs.writeFileSync(
        path.join(src, 'app.module.ts'),
        `${comment}\nimport { Module } from '@nestjs/common';\n${ctrlImports}\n${svcImports}\n\n@Module({\n  controllers: [${controllers}],\n${providerLine}\n})\nexport class AppModule {}\n`,
      );
    }
  }

  // ─── TypeORM config factory por motor ────────────────────────
  private buildTypeOrmFactory(dbEngine: string, instanceName?: string): string {
    const lines: string[] = [
      `// db.config.ts — Configuración de base de datos`,
      `// Las credenciales se leen desde variables de entorno en tiempo de ejecución`,
      `//`,
      `// ─── Fuentes de variables según ambiente ──────────────────`,
      `// Local dev  : archivo .env (solo desarrollo)`,
      `// Docker     : variables en docker run / docker-compose`,
      `// Kubernetes : Secrets de K8s montados como env vars`,
      `// Azure      : Azure Key Vault + App Configuration`,
      `// AWS        : Secrets Manager + Parameter Store`,
      `// HashiCorp  : Vault Agent Sidecar`,
      `// ──────────────────────────────────────────────────────────`,
      `import { ConfigService } from '@nestjs/config';`,
      `import { TypeOrmModuleOptions } from '@nestjs/typeorm';`,
      ``,
      `export function dbConfig(cfg: ConfigService): TypeOrmModuleOptions {`,
    ];

    if (dbEngine === 'mssql') {
      lines.push(
        `  return {`,
        `    type: 'mssql',`,
        `    host:     cfg.get<string>('DB_HOST', 'localhost'),`,
        `    port:     cfg.get<number>('DB_PORT', 1433),`,
        `    username: cfg.get<string>('DB_USER'),`,
        `    password: cfg.get<string>('DB_PASS'),`,
        `    database: cfg.get<string>('DB_NAME'),`,
        `    options: {`,
        `      encrypt:                false,`,
        `      trustServerCertificate: true,`,
        `      connectTimeout:         30000,`,
        instanceName
          ? `      instanceName: cfg.get<string>('DB_INSTANCE', '${instanceName}'),`
          : `      instanceName: cfg.get<string>('DB_INSTANCE') || undefined,`,
        `    },`,
        `    pool: { max: 25, min: 0 },`,
        `    autoLoadEntities: true,`,
        `    synchronize: false,`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    } else if (dbEngine === 'mysql') {
      lines.push(
        `  return {`,
        `    type: 'mysql',`,
        `    host:     cfg.get<string>('DB_HOST', 'localhost'),`,
        `    port:     cfg.get<number>('DB_PORT', 3306),`,
        `    username: cfg.get<string>('DB_USER'),`,
        `    password: cfg.get<string>('DB_PASS'),`,
        `    database: cfg.get<string>('DB_NAME'),`,
        `    autoLoadEntities: true,`,
        `    synchronize: false,`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    } else {
      lines.push(
        `  return {`,
        `    type: 'postgres',`,
        `    host:     cfg.get<string>('DB_HOST', 'localhost'),`,
        `    port:     cfg.get<number>('DB_PORT', 5432),`,
        `    username: cfg.get<string>('DB_USER'),`,
        `    password: cfg.get<string>('DB_PASS'),`,
        `    database: cfg.get<string>('DB_NAME'),`,
        `    ssl: cfg.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,`,
        `    autoLoadEntities: true,`,
        `    synchronize: false,`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    }

    lines.push(`}`, ``);
    return lines.join('\n');
  }

  // ─── main.ts ─────────────────────────────────────────────────
  private writeBffMain(src: string, name: string, authType?: string): void {
    const authImport = authType === 'jwt' ? `\nimport { ValidationPipe } from '@nestjs/common';` : '';
    fs.writeFileSync(
      path.join(src, 'main.ts'),
      `import { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\nimport { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';${authImport}\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  app.enableCors();\n  const config = new DocumentBuilder()\n    .setTitle('${name}')\n    .setDescription('Generado por Jarvis Platform')\n    .setVersion('1.0')\n    ${authType === 'jwt' ? '.addBearerAuth()' : ''}\n    .build();\n  const document = SwaggerModule.createDocument(app, config);\n  SwaggerModule.setup('api/docs', app, document);\n  const port = process.env.PORT ?? 3000;\n  await app.listen(port);\n  console.log(\`Service: http://localhost:\${port}\`);\n  console.log(\`Swagger: http://localhost:\${port}/api/docs\`);\n}\nbootstrap();\n`,
    );
  }

  // ─── package.json generado ───────────────────────────────────
  private writeBffPackageJson(dir: string, name: string, dto: GenerateDto): void {
    const pkg: any = {
      name, version: '1.0.0',
      scripts: {
        start: 'node dist/main',
        build: 'tsc -p tsconfig.json',
        'start:dev': 'ts-node -r tsconfig-paths/register src/main.ts',
      },
      dependencies: {
        '@nestjs/common': '^10.0.0', '@nestjs/core': '^10.0.0',
        '@nestjs/config': '^3.0.0',
        '@nestjs/platform-express': '^10.0.0', '@nestjs/swagger': '^7.0.0',
        'reflect-metadata': '^0.1.13', rxjs: '^7.8.0',
      },
      devDependencies: {
        typescript: '^5.0.0', 'ts-node': '^10.0.0', 'tsconfig-paths': '^4.0.0',
      },
    };

    if (dto.orm === 'typeorm') {
      pkg.dependencies['@nestjs/typeorm'] = '^10.0.0';
      pkg.dependencies['typeorm']         = '^0.3.0';
    } else if (dto.orm === 'prisma') {
      pkg.dependencies['@prisma/client'] = 'latest';
      pkg.devDependencies['prisma']      = 'latest';
    }

    if (dto.authType === 'jwt') {
      pkg.dependencies['@nestjs/jwt']      = '^10.0.0';
      pkg.dependencies['@nestjs/passport'] = '^10.0.0';
      pkg.dependencies['passport-jwt']     = 'latest';
    }

    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
        if (this.isSqlServer(ds.engine)) {
          pkg.dependencies['mssql']    = '^11.0.0';
          pkg.dependencies['tedious']  = 'latest';
        } else {
          pkg.dependencies[ds.npmLibrary] = 'latest';
        }
      } catch {}
    }

    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  // ─── .env file ───────────────────────────────────────────────
  private buildEnvFile(name: string, dto: GenerateDto, example = false): string {
    const val   = (v: string) => example ? '' : v;
    const lines = [
      `# ${name} — Environment Variables`,
      `# Generated by Jarvis Platform`,
      ``,
      `PORT=${val('3000')}`,
      `NODE_ENV=${val('development')}`,
    ];
    if (dto.datasourceId) {
      try {
        const ds    = this.datasourceService.findOne(dto.datasourceId);
        const isSql = this.isSqlServer(ds.engine);
        lines.push(
          ``, `# Database (${ds.engine})`,
          `# IMPORTANTE: En producción estas variables deben venir del runtime,`,
          `# NO del archivo .env. Usar K8s Secrets, Azure Key Vault, etc.`,
          `DB_HOST=${val(ds.host)}`,
          `DB_PORT=${val(String(ds.port))}`,
          `DB_USER=${val(ds.username)}`,
          `DB_PASS=${val(example ? '***REPLACE_WITH_SECRET***' : ds.password)}`,
          `DB_NAME=${val(ds.database)}`,
        );
        if (isSql) lines.push(`DB_INSTANCE=${val(ds.instanceName ?? '')}`);
      } catch {}
    }
    if (dto.authType === 'jwt') {
      lines.push(
        ``, `# JWT`,
        `JWT_SECRET=${val('change-me-in-production')}`,
        `JWT_EXPIRES_IN=${val('1d')}`,
      );
    }
    return lines.join('\n') + '\n';
  }
}
