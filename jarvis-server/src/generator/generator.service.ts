// generator.service.ts — Motor principal de generación de microservicios
// Soporta: UX (API First/OpenAPI), CN (BFF Canal), BS (BFF Negocio)
// Genera: código fuente, Dockerfile, .env, README.md, openapi.yaml
// Con TypeORM: entidades desde DB real, repositorios concretos, TypeOrmModule configurado
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import archiver from 'archiver';
import { DomainsService } from '../domains/domains.service';
import type { Domain } from '../domains/domains.service';
import { DatasourceService } from '../datasource/datasource.service';
import type { GenerationConfig } from '../generation-config/generation-config.service';

export interface GatewayService { name: string; url: string; protected: boolean; }

export interface GenerateDto {
  name: string;
  type: 'UX' | 'CN' | 'BS' | 'AG' | 'AA';
  domainId: string;
  datasourceId?: string;
  selectedTables?: string[];
  architecture?: 'hexagonal' | 'clean' | 'layered';
  orm?: 'typeorm' | 'prisma' | 'none';
  apiStyle?: 'rest' | 'graphql';
  authType?: 'none' | 'jwt' | 'oauth';
  observability?: { logs: boolean; metrics: boolean; tracing: boolean };
  gitEnabled?: boolean;
  gitRepoUrl?: string;
  gitBranch?: string;
  // AG — API Gateway
  gatewayServices?: GatewayService[];
  rateLimitTtl?: number;
  rateLimitMax?: number;
  requestTimeout?: number;
  allowedOrigins?: string;
  useSsl?: boolean;
  sslPort?: number;
  serverName?: string;
  certPath?: string;
  // AA — Auth Service
  authUser?: string;
  authPassword?: string;
  jwtExpiresIn?: string;
  jwtRefreshExpiresIn?: string;
}

// Internal entity representation used during code generation
interface GenField {
  name: string;
  type: string;
  nullable: boolean;
  isPk: boolean;
}

interface GenEntity {
  name: string;       // camelCase: 'patient'
  tableName: string;  // DB table: 'patients'
  schema?: string;    // DB schema: 'clinica', 'public', etc.
  fields: GenField[];
}

const TYPE_PREFIX: Record<string, string> = { UX: 'ds', CN: 'ms-cn', BS: 'ms-bs', AG: 'gw', AA: 'auth' };

@Injectable()
export class GeneratorService {
  constructor(
    private readonly domainsService: DomainsService,
    private readonly datasourceService: DatasourceService,
  ) {}

  async generate(dto: GenerateDto): Promise<{ zipPath: string; serviceName: string }> {
    const prefix = TYPE_PREFIX[dto.type] ?? 'ms-bs';
    const serviceName = `${prefix}-${dto.name.toLowerCase().replace(/\s+/g, '-')}`;
    const tmpDir = path.join(os.tmpdir(), `jarvis-${Date.now()}`, serviceName);

    if (dto.type === 'AG') {
      await this.generateApiGateway(tmpDir, serviceName, dto);
    } else if (dto.type === 'AA') {
      await this.generateApiAuth(tmpDir, serviceName, dto);
    } else if (dto.type === 'UX') {
      const domain = this.domainsService.findOne(dto.domainId);
      await this.generateSwaggerContract(tmpDir, serviceName, domain);
    } else {
      const domain = this.domainsService.findOne(dto.domainId);
      await this.generateBffMicroservice(tmpDir, serviceName, domain, dto);
    }

    const zipPath = path.join(os.tmpdir(), `${serviceName}.zip`);
    await this.zipDir(tmpDir, zipPath);
    return { zipPath, serviceName };
  }

  // ─────────────────────────────────────────────────────────────
  // UX → API First: contrato OpenAPI/Swagger completo
  // ─────────────────────────────────────────────────────────────
  private async generateSwaggerContract(dir: string, name: string, domain: Domain) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildOpenApiSpec(name, domain));
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildReadme(name, domain, 'UX', {}));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name, version: '1.0.0',
        scripts: { mock: 'prism mock openapi.yaml', validate: 'swagger-cli validate openapi.yaml' },
        devDependencies: { '@stoplight/prism-cli': 'latest', 'swagger-cli': 'latest' },
      }, null, 2),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CN / BS → BFF NestJS microservice completo
  // ─────────────────────────────────────────────────────────────
  private async generateBffMicroservice(dir: string, name: string, domain: Domain, dto: GenerateDto) {
    const arch = dto.architecture ?? 'hexagonal';
    const orm = dto.orm ?? 'none';
    const srcDir = path.join(dir, 'src');

    // ── Resolver entidades ──────────────────────────────────────
    // Si el usuario seleccionó tablas de la DB + ORM TypeORM:
    //   → introspectar columnas reales y usarlas como entidades
    // Si no: usar las entidades del dominio configurado
    let entities: GenEntity[];

    if (orm === 'typeorm' && dto.selectedTables?.length && dto.datasourceId) {
      entities = [];
      for (const table of dto.selectedTables) {
        const columns = await this.datasourceService.getTableColumns(dto.datasourceId, table);
        entities.push({
          name: this.tableToEntityName(table),
          tableName: table,
          fields: columns.map(c => ({
            name: c.name,
            type: c.type,
            nullable: c.nullable,
            isPk: c.name === 'id',
          })),
        });
      }
    } else {
      entities = domain.entities.map(e => ({
        name: e.name,
        tableName: `${e.name}s`,
        schema: domain.schema || undefined,
        fields: e.fields.map(f => ({
          name: f.name,
          type: f.type,
          nullable: !f.required,
          isPk: f.name === 'id',
        })),
      }));
    }

    // ── Obtener engine + config del datasource para TypeORM ────
    let dbEngine = 'postgres';
    let dbInstanceName: string | undefined;
    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
        if (ds.engine.toLowerCase().includes('mysql')) dbEngine = 'mysql';
        else if (this.isSqlServer(ds.engine)) { dbEngine = 'mssql'; dbInstanceName = ds.instanceName; }
        else dbEngine = 'postgres';
      } catch {}
    }

    // ── Estructura de carpetas según arquitectura ───────────────
    const folders = arch === 'layered'
      ? ['src/controllers', 'src/services', 'src/entities', 'src/dto']
      : ['src/domain/entities', 'src/domain/repositories', 'src/application/use-cases',
         'src/infrastructure/controllers', 'src/infrastructure/persistence', 'src/dto'];

    folders.forEach(f => fs.mkdirSync(path.join(dir, f), { recursive: true }));

    // ── Generar archivos por entidad ────────────────────────────
    for (const entity of entities) {
      if (arch === 'layered') {
        this.writeLayeredEntity(srcDir, entity, orm);
        this.writeLayeredService(srcDir, entity, orm);
        this.writeLayeredController(srcDir, entity, dto.type);
      } else {
        this.writeHexEntity(srcDir, entity, orm);
        this.writeHexRepositoryInterface(srcDir, entity);
        this.writeHexUseCase(srcDir, entity);
        this.writeHexController(srcDir, entity, dto.type);
        if (orm === 'typeorm') {
          this.writeTypeOrmRepositoryImpl(srcDir, entity);
        }
      }
      this.writeDto(srcDir, entity);
    }

    // ── App module, main, configs ───────────────────────────────
    this.writeAppModule(srcDir, entities, dto, arch, orm, dbEngine, dbInstanceName);
    this.writeBffMain(srcDir, name, dto.authType);
    this.writeBffPackageJson(dir, name, dto);
    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    fs.writeFileSync(path.join(dir, '.env'), this.buildEnvFile(name, dto));
    fs.writeFileSync(path.join(dir, '.env.example'), this.buildEnvFile(name, dto, true));
    fs.writeFileSync(path.join(dir, 'Dockerfile'), this.buildDockerfile(name));
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');
    fs.writeFileSync(path.join(dir, 'README.md'), this.buildReadme(name, domain, dto.type, dto));
    fs.writeFileSync(path.join(dir, 'openapi.yaml'), this.buildOpenApiSpec(name, domain));
  }

  // ─── Layered: entity ─────────────────────────────────────────
  private writeLayeredEntity(src: string, entity: GenEntity, orm: string) {
    const E = this.pascal(entity.name);
    let content: string;
    if (orm === 'typeorm') {
      const imports = new Set<string>(['Entity', 'Column']);
      entity.fields.forEach(f => { if (f.isPk) imports.add('PrimaryColumn'); });
      const props = entity.fields.map(f => this.buildTypeOrmProp(f)).join('\n\n');
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
  private writeLayeredService(src: string, entity: GenEntity, orm: string) {
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
  private writeLayeredController(src: string, entity: GenEntity, type: string) {
    const E = this.pascal(entity.name);
    const tag = type === 'CN' ? '// BFF Canal\n' : '// BFF Negocio\n';
    fs.writeFileSync(
      path.join(src, 'controllers', `${entity.name}.controller.ts`),
      `${tag}import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';\nimport { ${E}Service } from '../services/${entity.name}.service';\nimport { Create${E}Dto } from '../dto/create-${entity.name}.dto';\n\n@Controller('${entity.name}s')\nexport class ${E}Controller {\n  constructor(private readonly service: ${E}Service) {}\n  @Get() findAll() { return this.service.findAll(); }\n  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }\n  @Post() create(@Body() dto: Create${E}Dto) { return this.service.create(dto); }\n  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string) { this.service.remove(id); }\n}\n`,
    );
  }

  // ─── Hexagonal: entity ───────────────────────────────────────
  private writeHexEntity(src: string, entity: GenEntity, orm: string) {
    const E = this.pascal(entity.name);
    let content: string;
    if (orm === 'typeorm') {
      const imports = new Set<string>(['Entity', 'Column']);
      entity.fields.forEach(f => { if (f.isPk) imports.add('PrimaryColumn'); });
      const props = entity.fields.map(f => this.buildTypeOrmProp(f)).join('\n\n');
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
  private writeHexRepositoryInterface(src: string, entity: GenEntity) {
    const E = this.pascal(entity.name);
    fs.writeFileSync(
      path.join(src, 'domain/repositories', `${entity.name}.repository.ts`),
      `import { ${E} } from '../entities/${entity.name}.entity';\n\nexport interface ${E}Repository {\n  save(entity: ${E}): Promise<${E}>;\n  findById(id: string): Promise<${E} | null>;\n  findAll(): Promise<${E}[]>;\n  delete(id: string): Promise<void>;\n}\n`,
    );
  }

  // ─── Hexagonal: use case ─────────────────────────────────────
  private writeHexUseCase(src: string, entity: GenEntity) {
    const E = this.pascal(entity.name);
    fs.writeFileSync(
      path.join(src, 'application/use-cases', `${entity.name}.use-case.ts`),
      `import { ${E} } from '../../domain/entities/${entity.name}.entity';\nimport { ${E}Repository } from '../../domain/repositories/${entity.name}.repository';\n\nexport class ${E}UseCase {\n  constructor(private readonly repo: ${E}Repository) {}\n  findAll(): Promise<${E}[]> { return this.repo.findAll(); }\n  findById(id: string): Promise<${E} | null> { return this.repo.findById(id); }\n  create(data: Partial<${E}>): Promise<${E}> { return this.repo.save(data as ${E}); }\n  delete(id: string): Promise<void> { return this.repo.delete(id); }\n}\n`,
    );
  }

  // ─── Hexagonal: controller ───────────────────────────────────
  private writeHexController(src: string, entity: GenEntity, type: string) {
    const E = this.pascal(entity.name);
    const tag = type === 'CN' ? '// BFF Canal — orquesta llamadas a servicios externos\n' : '// BFF Negocio — aplica reglas de negocio\n';
    fs.writeFileSync(
      path.join(src, 'infrastructure/controllers', `${entity.name}.controller.ts`),
      `${tag}import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';\nimport { Create${E}Dto } from '../../dto/create-${entity.name}.dto';\n\n@Controller('${entity.name}s')\nexport class ${E}Controller {\n  @Get() findAll() { return []; }\n  @Get(':id') findOne(@Param('id') id: string) { return { id }; }\n  @Post() create(@Body() dto: Create${E}Dto) { return dto; }\n  @Put(':id') update(@Param('id') id: string, @Body() dto: Partial<Create${E}Dto>) { return { id, ...dto }; }\n  @Delete(':id') @HttpCode(204) remove(@Param('id') _id: string) {}\n}\n`,
    );
  }

  // ─── TypeORM: repositorio concreto (solo hexagonal) ──────────
  // Implementa la interfaz del dominio usando TypeORM Repository
  private writeTypeOrmRepositoryImpl(src: string, entity: GenEntity) {
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
  private writeDto(src: string, entity: GenEntity) {
    const E = this.pascal(entity.name);
    const fields = entity.fields
      .filter(f => !f.isPk)
      .map(f => `  ${f.name}${f.nullable ? '?' : '!'}: ${f.type};`)
      .join('\n');
    fs.writeFileSync(path.join(src, 'dto', `create-${entity.name}.dto.ts`), `export class Create${E}Dto {\n${fields}\n}\n`);
  }

  // ─── App Module ───────────────────────────────────────────────
  // Con TypeORM: usa ConfigModule + ConfigService (NO process.env directamente)
  //   → patrón seguro: las credenciales vienen de variables de entorno inyectadas
  //     en tiempo de ejecución (K8s Secrets, Azure Key Vault, Vault, etc.)
  // Sin ORM: módulo estándar NestJS
  private writeAppModule(src: string, entities: GenEntity[], dto: GenerateDto, arch: string, orm: string, dbEngine: string, dbInstanceName?: string) {
    const isLayered = arch === 'layered';
    const ctrlPath = isLayered ? './controllers' : './infrastructure/controllers';
    const comment = dto.type === 'CN' ? '// BFF Canal' : '// BFF Negocio';

    const ctrlImports = entities.map(e =>
      `import { ${this.pascal(e.name)}Controller } from '${ctrlPath}/${e.name}.controller';`
    ).join('\n');
    const controllers = entities.map(e => `${this.pascal(e.name)}Controller`).join(', ');

    if (orm === 'typeorm') {
      const entityPath = isLayered ? './entities' : './domain/entities';
      const entityImports = entities.map(e =>
        `import { ${this.pascal(e.name)} } from '${entityPath}/${e.name}.entity';`
      ).join('\n');
      const entityList = entities.map(e => this.pascal(e.name)).join(', ');

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

      // Genera la config de TypeORM según el motor de BD
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
        `    // ConfigModule carga variables de entorno y las valida al arrancar`,
        `    // En producción NO usar .env — las vars vienen del runtime (K8s, Azure, Docker)`,
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

      // Genera el archivo de configuración de BD separado
      // db.config.ts usa autoLoadEntities → NO necesita importar las entity classes
      fs.mkdirSync(path.join(src, 'config'), { recursive: true });
      fs.writeFileSync(path.join(src, 'config', 'db.config.ts'), typeOrmFactory);

    } else {
      let svcImports = '';
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
  // Se genera como archivo separado src/config/db.config.ts
  // Usa ConfigService → las credenciales NUNCA están hardcodeadas en el código
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
        `    autoLoadEntities: true,  // registra entidades vía forFeature(), sin importarlas aquí`,
        `    synchronize: false,      // cambiar a true solo en desarrollo para auto-crear tablas`,
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
        `    synchronize: false,      // cambiar a true solo en desarrollo para auto-crear tablas`,
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
        `    synchronize: false,      // cambiar a true solo en desarrollo para auto-crear tablas`,
        `    logging: cfg.get('NODE_ENV') === 'development',`,
        `  };`,
      );
    }

    lines.push(`}`, ``);
    return lines.join('\n');
  }

  // ─── main.ts ─────────────────────────────────────────────────
  private writeBffMain(src: string, name: string, authType?: string) {
    const authImport = authType === 'jwt' ? `\nimport { ValidationPipe } from '@nestjs/common';` : '';
    fs.writeFileSync(
      path.join(src, 'main.ts'),
      `import { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\nimport { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';${authImport}\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  app.enableCors();\n  const config = new DocumentBuilder()\n    .setTitle('${name}')\n    .setDescription('Generado por Jarvis Platform')\n    .setVersion('1.0')\n    ${authType === 'jwt' ? '.addBearerAuth()' : ''}\n    .build();\n  const document = SwaggerModule.createDocument(app, config);\n  SwaggerModule.setup('api/docs', app, document);\n  const port = process.env.PORT ?? 3000;\n  await app.listen(port);\n  console.log(\`Service: http://localhost:\${port}\`);\n  console.log(\`Swagger: http://localhost:\${port}/api/docs\`);\n}\nbootstrap();\n`,
    );
  }

  // ─── package.json generado ───────────────────────────────────
  private writeBffPackageJson(dir: string, name: string, dto: GenerateDto) {
    const pkg: any = {
      name, version: '1.0.0',
      scripts: { start: 'node dist/main', build: 'tsc -p tsconfig.json', 'start:dev': 'ts-node -r tsconfig-paths/register src/main.ts' },
      dependencies: {
        '@nestjs/common': '^10.0.0', '@nestjs/core': '^10.0.0',
        '@nestjs/config': '^3.0.0',                               // siempre incluido — gestión segura de vars
        '@nestjs/platform-express': '^10.0.0', '@nestjs/swagger': '^7.0.0',
        'reflect-metadata': '^0.1.13', rxjs: '^7.8.0',
      },
      devDependencies: { typescript: '^5.0.0', 'ts-node': '^10.0.0', 'tsconfig-paths': '^4.0.0' },
    };

    if (dto.orm === 'typeorm') {
      pkg.dependencies['@nestjs/typeorm'] = '^10.0.0';
      pkg.dependencies['typeorm'] = '^0.3.0';
    } else if (dto.orm === 'prisma') {
      pkg.dependencies['@prisma/client'] = 'latest';
      pkg.devDependencies['prisma'] = 'latest';
    }

    if (dto.authType === 'jwt') {
      pkg.dependencies['@nestjs/jwt'] = '^10.0.0';
      pkg.dependencies['@nestjs/passport'] = '^10.0.0';
      pkg.dependencies['passport-jwt'] = 'latest';
    }

    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
        // Driver según motor
        if (this.isSqlServer(ds.engine)) {
          pkg.dependencies['mssql'] = '^11.0.0';
          pkg.dependencies['tedious'] = 'latest';  // requerido por TypeORM para mssql
        } else {
          pkg.dependencies[ds.npmLibrary] = 'latest';
        }
      } catch {}
    }

    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  // ─── tsconfig.json generado ──────────────────────────────────
  private writeBffTsConfig(dir: string) {
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'commonjs', target: 'ES2021', strict: true,
          outDir: './dist', baseUrl: './',
          experimentalDecorators: true, emitDecoratorMetadata: true,
          paths: { '@/*': ['src/*'] },
        },
      }, null, 2),
    );
  }

  // ─── .env file ───────────────────────────────────────────────
  private buildEnvFile(name: string, dto: GenerateDto, example = false): string {
    const val = (v: string) => example ? '' : v;
    const lines = [
      `# ${name} — Environment Variables`,
      `# Generated by Jarvis Platform`,
      ``,
      `PORT=${val('3000')}`,
      `NODE_ENV=${val('development')}`,
    ];
    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
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
      lines.push(``, `# JWT`, `JWT_SECRET=${val('change-me-in-production')}`, `JWT_EXPIRES_IN=${val('1d')}`);
    }
    return lines.join('\n') + '\n';
  }

  // ─── Dockerfile multi-stage ──────────────────────────────────
  private buildDockerfile(name: string): string {
    return `# Dockerfile — ${name}
# Multi-stage build generado por Jarvis Platform

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
`;
  }

  // ─── README.md ───────────────────────────────────────────────
  private buildReadme(name: string, domain: Domain, type: string, dto: Partial<GenerateDto>): string {
    const strategy = type === 'UX' ? 'API First (OpenAPI Contract)' : type === 'CN' ? 'BFF Canal (Integración)' : 'BFF Negocio (Lógica de negocio)';
    const arch = dto.architecture ?? 'hexagonal';
    const orm = dto.orm ?? 'none';
    const auth = dto.authType ?? 'none';
    const tables = dto.selectedTables?.length ? `\n\n**Tablas de BD:** ${dto.selectedTables.join(', ')}` : '';

    const entities = domain.entities.map((e) =>
      `### ${this.pascal(e.name)}\n| Campo | Tipo | Requerido |\n|-------|------|----------|\n${e.fields.map((f) => `| ${f.name} | ${f.type} | ${f.required ? '✓' : '—'} |`).join('\n')}`
    ).join('\n\n');

    const endpoints = domain.entities.map((e) =>
      `- \`GET    /${e.name}s\` — Listar\n- \`GET    /${e.name}s/:id\` — Obtener\n- \`POST   /${e.name}s\` — Crear\n- \`PUT    /${e.name}s/:id\` — Actualizar\n- \`DELETE /${e.name}s/:id\` — Eliminar`
    ).join('\n');

    return `# ${name}

> Generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}

## Estrategia
${strategy}

## Stack Tecnológico
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS 10
- **Arquitectura**: ${arch}
- **ORM**: ${orm}
- **Auth**: ${auth}
- **API Docs**: Swagger UI (\`/api/docs\`)${tables}

## Dominio: ${domain.name}

${entities}

## Endpoints

${endpoints}

## Instalación

\`\`\`bash
npm install
cp .env.example .env
# Editar .env con tus valores reales
npm run start:dev
\`\`\`

## Docker

\`\`\`bash
docker build -t ${name} .
docker run -p 3000:3000 --env-file .env ${name}
\`\`\`

## Swagger UI

Disponible en: \`http://localhost:3000/api/docs\`
`;
  }

  // ─── OpenAPI spec ────────────────────────────────────────────
  private buildOpenApiSpec(name: string, domain: Domain): string {
    const lines: string[] = [`openapi: "3.0.3"`, `info:`, `  title: ${name}`, `  description: API Contract — Dominio ${domain.name} — Jarvis Platform`, `  version: "1.0.0"`, `paths:`];

    for (const entity of domain.entities) {
      const tag = entity.name;
      const Tag = this.pascal(tag);
      lines.push(
        `  /${tag}s:`,
        `    get:`, `      tags: [${Tag}]`, `      summary: Listar ${tag}s`, `      operationId: findAll${Tag}s`,
        `      responses:`, `        "200":`, `          description: OK`, `          content:`, `            application/json:`, `              schema:`, `                type: array`, `                items:`, `                  $ref: "#/components/schemas/${Tag}"`,
        `    post:`, `      tags: [${Tag}]`, `      summary: Crear ${tag}`, `      operationId: create${Tag}`,
        `      requestBody:`, `        required: true`, `        content:`, `          application/json:`, `            schema:`, `              $ref: "#/components/schemas/Create${Tag}Dto"`,
        `      responses:`, `        "201":`, `          description: Creado`, `          content:`, `            application/json:`, `              schema:`, `                $ref: "#/components/schemas/${Tag}"`,
        `  /${tag}s/{id}:`,
        `    get:`, `      tags: [${Tag}]`, `      summary: Obtener ${tag}`, `      operationId: findOne${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`, `          schema:`, `            type: string`,
        `      responses:`, `        "200":`, `          description: OK`, `          content:`, `            application/json:`, `              schema:`, `                $ref: "#/components/schemas/${Tag}"`,
        `        "404":`, `          description: No encontrado`,
        `    put:`, `      tags: [${Tag}]`, `      summary: Actualizar ${tag}`, `      operationId: update${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`, `          schema:`, `            type: string`,
        `      requestBody:`, `        required: true`, `        content:`, `          application/json:`, `            schema:`, `              $ref: "#/components/schemas/Create${Tag}Dto"`,
        `      responses:`, `        "200":`, `          description: Actualizado`,
        `    delete:`, `      tags: [${Tag}]`, `      summary: Eliminar ${tag}`, `      operationId: delete${Tag}`,
        `      parameters:`, `        - name: id`, `          in: path`, `          required: true`, `          schema:`, `            type: string`,
        `      responses:`, `        "204":`, `          description: Eliminado`,
      );
    }

    lines.push(`components:`, `  schemas:`);
    for (const entity of domain.entities) {
      const Tag = this.pascal(entity.name);
      const required = entity.fields.filter((f) => f.required).map((f) => f.name);
      lines.push(`    ${Tag}:`, `      type: object`);
      if (required.length) lines.push(`      required: [${required.join(', ')}]`);
      lines.push(`      properties:`);
      entity.fields.forEach((f) => { lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`); });

      const dtoFields = entity.fields.filter((f) => f.name !== 'id');
      const dtoRequired = dtoFields.filter((f) => f.required).map((f) => f.name);
      lines.push(`    Create${Tag}Dto:`, `      type: object`);
      if (dtoRequired.length) lines.push(`      required: [${dtoRequired.join(', ')}]`);
      lines.push(`      properties:`);
      dtoFields.forEach((f) => { lines.push(`        ${f.name}:`, `          type: ${this.toOasType(f.type)}`); });
    }

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────────
  // AG → API Gateway hexagonal con rate-limit, proxy JWT, SSL
  // ─────────────────────────────────────────────────────────────
  private async generateApiGateway(dir: string, name: string, dto: GenerateDto) {
    const src = path.join(dir, 'src');
    fs.mkdirSync(path.join(src, 'gateway'), { recursive: true });
    fs.mkdirSync(path.join(src, 'auth'),    { recursive: true });
    fs.mkdirSync(path.join(src, 'config'),  { recursive: true });

    const svcs = dto.gatewayServices ?? [];
    const httpPort  = 10100;
    const sslPort   = dto.sslPort   ?? 20100;
    const rlTtl     = dto.rateLimitTtl  ?? 60;
    const rlMax     = dto.rateLimitMax  ?? 100;
    const timeout   = dto.requestTimeout ?? 120000;
    const certPath  = dto.certPath  ?? '/app/certs';

    // main.ts
    fs.writeFileSync(path.join(src, 'main.ts'), `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const useSSL = process.env.USE_SSL === 'true';
  const port   = useSSL
    ? Number(process.env.SSL_PORT  ?? ${sslPort})
    : Number(process.env.PORT      ?? ${httpPort});

  let httpsOptions: any = undefined;
  if (useSSL) {
    const certDir = process.env.CERT_PATH ?? '${certPath}';
    try {
      httpsOptions = {
        key:  fs.readFileSync(path.join(certDir, 'server.key')),
        cert: fs.readFileSync(path.join(certDir, 'server.crt')),
      };
    } catch {
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: SSL certificates not found at', certDir);
        process.exit(1);
      } else {
        console.warn('WARNING: SSL certificates not found — running without HTTPS');
      }
    }
  }

  const app = await NestFactory.create(AppModule, httpsOptions ? { httpsOptions } : {});

  const origins = process.env.ALLOWED_ORIGINS;
  app.enableCors({
    origin: process.env.NODE_ENV === 'development'
      ? true
      : (origins ? origins.split(',') : false),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  await app.listen(port);
  console.log(\`🚀 ${name} on \${useSSL ? 'https' : 'http'}://localhost:\${port}\`);
}
bootstrap();
`);

    // app.module.ts
    fs.writeFileSync(path.join(src, 'app.module.ts'), `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl:   Number(process.env.RATE_LIMIT_TTL  ?? ${rlTtl}) * 1000,
      limit: Number(process.env.RATE_LIMIT_MAX  ?? ${rlMax}),
    }]),
    GatewayModule,
  ],
})
export class AppModule {}
`);

    // gateway.module.ts
    fs.writeFileSync(path.join(src, 'gateway', 'gateway.module.ts'), `import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        timeout: Number(cfg.get('REQUEST_TIMEOUT', '${timeout}')),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
`);

    // gateway.controller.ts
    const hasProtected = svcs.some(s => s.protected);
    const guardImport  = hasProtected ? `\nimport { JwtAuthGuard } from '../auth/jwt-auth.guard';` : '';
    const routes = svcs.map(s => {
      const guard = s.protected ? '\n  @UseGuards(JwtAuthGuard)' : '';
      const fn    = this.pascal(s.name.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()));
      return `  @All('${s.name}/*')${guard}\n  async proxy${fn}(@Req() req: Request, @Res() res: Response) {\n    return this.gatewayService.proxyRequest(req, res, '${s.name}');\n  }`;
    }).join('\n\n');

    fs.writeFileSync(path.join(src, 'gateway', 'gateway.controller.ts'), `import { Controller, All, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GatewayService } from './gateway.service';${guardImport}

@Controller()
@UseGuards(ThrottlerGuard)
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

${routes}

  @Get('health')
  async health() {
    return this.gatewayService.healthCheck();
  }

  @Get()
  info() {
    return {
      service: '${name}',
      type: 'API Gateway',
      timestamp: new Date().toISOString(),
      routes: [${svcs.map(s => `'/${s.name}'`).join(', ')}],
    };
  }
}
`);

    // gateway.service.ts
    const svcMapEntries = svcs.map(s => {
      const envKey = s.name.replace(/-/g, '_').toUpperCase() + '_URL';
      return `      '/${s.name}': this.cfg.get('${envKey}', '${s.url}'),`;
    }).join('\n');

    fs.writeFileSync(path.join(src, 'gateway', 'gateway.service.ts'), `import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayService {
  private readonly svcMap: Record<string, string>;

  constructor(
    private readonly http: HttpService,
    private readonly cfg:  ConfigService,
  ) {
    this.svcMap = {
${svcMapEntries}
    };
  }

  async proxyRequest(req: Request, res: Response, prefix: string) {
    const baseUrl = this.svcMap[\`/\${prefix}\`];
    if (!baseUrl) return res.status(404).json({ error: \`Service /\${prefix} not found\` });

    const targetUrl = \`\${baseUrl}\${req.url}\`;
    const headers   = { ...req.headers };
    delete headers['host'];
    delete headers['connection'];
    delete headers['content-length'];

    try {
      const r = await firstValueFrom(
        this.http.request({
          method: req.method as any,
          url: targetUrl,
          headers,
          data: req.body,
          validateStatus: () => true,
        }),
      );
      return res.status(r.status).json(r.data);
    } catch (err: any) {
      return res.status(502).json({ error: 'Bad Gateway', detail: err.message });
    }
  }

  async healthCheck() {
    const results: Record<string, any> = {};
    for (const [route, url] of Object.entries(this.svcMap)) {
      try {
        await firstValueFrom(this.http.get(\`\${url}/health\`, { timeout: 5000, validateStatus: () => true }));
        results[route] = { status: 'UP', url };
      } catch {
        results[route] = { status: 'DOWN', url };
      }
    }
    return { gateway: { status: 'UP', timestamp: new Date().toISOString() }, services: results };
  }
}
`);

    // jwt-auth.guard.ts
    fs.writeFileSync(path.join(src, 'auth', 'jwt-auth.guard.ts'), `import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly http:   HttpService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req        = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');

    const authUrl = this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:10101');
    try {
      const r = await firstValueFrom(
        this.http.post(\`\${authUrl}/auth/validate\`, {}, { headers: { Authorization: authHeader } }),
      );
      if (r.data?.success) { req.user = r.data.data; return true; }
    } catch {}
    throw new UnauthorizedException('Token inválido o expirado');
  }
}
`);

    // config/services.config.ts
    const cfgEntries = svcs.map(s => {
      const k = s.name.replace(/-/g, '_').toUpperCase() + '_URL';
      return `  '/${s.name}': process.env.${k} ?? '${s.url}',`;
    }).join('\n');
    fs.writeFileSync(path.join(src, 'config', 'services.config.ts'), `// services.config.ts — URLs de servicios backend\nexport const SERVICE_MAP: Record<string, string> = {\n${cfgEntries}\n};\n`);

    // package.json
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name, version: '1.0.0',
      scripts: { build: 'nest build', 'start:dev': 'nest start --watch', 'start:prod': 'node dist/main' },
      dependencies: {
        '@nestjs/axios': '^4.0.0', '@nestjs/common': '^11.0.0', '@nestjs/config': '^4.0.0',
        '@nestjs/core': '^11.0.0', '@nestjs/platform-express': '^11.0.0', '@nestjs/throttler': '^6.0.0',
        'axios': '^1.7.0', 'rxjs': '^7.8.0', 'reflect-metadata': '^0.2.0',
      },
      devDependencies: {
        '@nestjs/cli': '^11.0.0', '@nestjs/schematics': '^11.0.0', 'typescript': '^5.3.0',
        '@types/express': '^5.0.0', '@types/node': '^22.0.0',
      },
    }, null, 2));

    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    // .env
    const svcEnvLines = svcs.map(s => `${s.name.replace(/-/g, '_').toUpperCase()}_URL=${s.url}`).join('\n');
    const authLine = svcs.find(s => s.name === 'auth') ? '' : `AUTH_SERVICE_URL=http://localhost:10101\n`;
    fs.writeFileSync(path.join(dir, '.env'), `# ${name} — API Gateway\n# Generated by Jarvis Platform\n\nPORT=${httpPort}\nSSL_PORT=${sslPort}\nUSE_SSL=${dto.useSsl ? 'true' : 'false'}\nNODE_ENV=development\n\n# SSL — coloca server.key y server.crt en la ruta indicada\nCERT_PATH=${certPath}\nSERVER_NAME=${dto.serverName ?? ''}\n\n# Rate Limiting\nRATE_LIMIT_TTL=${rlTtl}\nRATE_LIMIT_MAX=${rlMax}\n\n# Timeout (ms)\nREQUEST_TIMEOUT=${timeout}\n\n# CORS — separar por comas, sin espacios\nALLOWED_ORIGINS=${dto.allowedOrigins ?? ''}\n\n# Backend services\n${authLine}${svcEnvLines}\n`);
    fs.writeFileSync(path.join(dir, '.env.example'), `# ${name} — API Gateway\n# Generated by Jarvis Platform\n\nPORT=\nSSL_PORT=\nUSE_SSL=false\nNODE_ENV=development\n\nCERT_PATH=${certPath}\nSERVER_NAME=\n\nRATE_LIMIT_TTL=${rlTtl}\nRATE_LIMIT_MAX=${rlMax}\nREQUEST_TIMEOUT=${timeout}\nALLOWED_ORIGINS=\n\n${authLine}${svcs.map(s => `${s.name.replace(/-/g, '_').toUpperCase()}_URL=`).join('\n')}\n`);

    // Dockerfile
    fs.writeFileSync(path.join(dir, 'Dockerfile'), `# Dockerfile — ${name} (API Gateway)\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S nestjs && adduser -S nestjs -G nestjs\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /app/dist ./dist\nVOLUME ["/app/certs"]\nEXPOSE ${httpPort} ${sslPort}\nUSER nestjs\nHEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${httpPort}/health || exit 1\nCMD ["node", "dist/main"]\n`);
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // README
    const svcTable = svcs.map(s => `| /${s.name} | ${s.url} | ${s.protected ? '✓ JWT' : 'Público'} |`).join('\n');
    fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}\n\n> API Gateway generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}\n\n## Servicios proxiados\n\n| Ruta | URL Backend | Protección |\n|------|-------------|------------|\n${svcTable}\n\n## Rate Limiting\n- Ventana: **${rlTtl}s** | Máx requests: **${rlMax}**\n\n## SSL\n- \`USE_SSL=true\` activa HTTPS en el puerto \`SSL_PORT\`\n- Coloca \`server.key\` y \`server.crt\` en la ruta definida por \`CERT_PATH\` (default: \`${certPath}\`)\n\n## Instalación\n\n\`\`\`bash\nnpm install\ncp .env.example .env\nnpm run start:dev\n\`\`\`\n`);
  }

  // ─────────────────────────────────────────────────────────────
  // AA → Auth Service hexagonal con JWT + Refresh Token
  // ─────────────────────────────────────────────────────────────
  private async generateApiAuth(dir: string, name: string, dto: GenerateDto) {
    const src     = path.join(dir, 'src');
    const authDir = path.join(src, 'modules', 'auth');
    fs.mkdirSync(authDir, { recursive: true });

    const port       = 10101;
    const expiresIn  = dto.jwtExpiresIn        ?? '4h';
    const refreshIn  = dto.jwtRefreshExpiresIn ?? '7d';
    const authUser   = dto.authUser   ?? 'admin';

    // main.ts
    fs.writeFileSync(path.join(src, 'main.ts'), `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app  = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? ${port});
  await app.listen(port);
  console.log(\`🔐 ${name} running on http://localhost:\${port}\`);
}
bootstrap();
`);

    // app.module.ts
    fs.writeFileSync(path.join(src, 'app.module.ts'), `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
  ],
})
export class AppModule {}
`);

    // auth.module.ts
    fs.writeFileSync(path.join(authDir, 'auth.module.ts'), `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthDao } from './auth.dao';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN', '${expiresIn}') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthDao],
})
export class AuthModule {}
`);

    // auth.controller.ts
    fs.writeFileSync(path.join(authDir, 'auth.controller.ts'), `import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token);
  }

  @Post('validate')
  async validate(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
    return this.authService.validateToken(authHeader.replace('Bearer ', '').trim());
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
    await this.authService.validateToken(authHeader.replace('Bearer ', '').trim());
    return { success: true, message: 'Logout successful' };
  }

  @Get('health')
  health() {
    return { status: 'OK', service: '${name}', timestamp: new Date().toISOString(), port: process.env.PORT };
  }
}
`);

    // auth.service.ts
    fs.writeFileSync(path.join(authDir, 'auth.service.ts'), `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthDao } from './auth.dao';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt:    JwtService,
    private readonly config: ConfigService,
    private readonly dao:    AuthDao,
  ) {}

  async login(username: string, password: string) {
    const valid = await this.dao.validateUser(username, password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const payload      = { username, roles: [], sub: 0, email: 'sistema@clinica.com' };
    const accessToken  = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret:    this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '${refreshIn}'),
    } as any);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user:          payload,
        access_token:  accessToken,
        expires_in:    this.config.get<string>('JWT_EXPIRES_IN', '${expiresIn}'),
        token_type:    'Bearer',
        refresh_token: refreshToken,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const payload     = { username: decoded.username, roles: decoded.roles, sub: decoded.sub, email: decoded.email };
      const accessToken = this.jwt.sign(payload);
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          access_token: accessToken,
          expires_in:   this.config.get<string>('JWT_EXPIRES_IN', '${expiresIn}'),
          token_type:   'Bearer',
        },
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async validateToken(token: string) {
    try {
      const d = this.jwt.verify(token);
      return {
        success: true,
        message: 'Token is valid',
        data: { userId: d.sub, username: d.username, email: d.email, roles: d.roles, exp: d.exp, iat: d.iat },
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
`);

    // auth.dao.ts
    fs.writeFileSync(path.join(authDir, 'auth.dao.ts'), `import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Autenticación con usuario y contraseña fijos desde variables de entorno.
// No se conecta a base de datos ni a Active Directory.
@Injectable()
export class AuthDao {
  constructor(private readonly config: ConfigService) {}

  async validateUser(username: string, password: string): Promise<boolean> {
    const validUser = this.config.get<string>('AUTH_USER',     '${authUser}');
    const validPass = this.config.get<string>('AUTH_PASSWORD', '');
    return username === validUser && password === validPass;
  }
}
`);

    // package.json
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name, version: '1.0.0',
      scripts: { build: 'nest build', 'start:dev': 'nest start --watch', 'start:prod': 'node dist/main' },
      dependencies: {
        '@nestjs/common': '^11.0.0', '@nestjs/config': '^4.0.0', '@nestjs/core': '^11.0.0',
        '@nestjs/jwt': '^11.0.0', '@nestjs/passport': '^11.0.0', '@nestjs/platform-express': '^11.0.0',
        'passport': '^0.7.0', 'passport-jwt': '^4.0.1', 'rxjs': '^7.8.0', 'reflect-metadata': '^0.2.0',
      },
      devDependencies: {
        '@nestjs/cli': '^11.0.0', '@nestjs/schematics': '^11.0.0', 'typescript': '^5.3.0',
        '@types/express': '^5.0.0', '@types/node': '^22.0.0', '@types/passport-jwt': '^4.0.1',
      },
    }, null, 2));

    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    // .env — JWT secrets autogenerados (64 bytes hex, únicos por generación)
    const jwtSecret     = crypto.randomBytes(64).toString('hex');
    const jwtRefSecret  = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(path.join(dir, '.env'), `# ${name} — Auth Service\n# Generated by Jarvis Platform\n\nPORT=${port}\nNODE_ENV=development\n\n# Credenciales fijas — CAMBIAR EN PRODUCCIÓN\nAUTH_USER=${authUser}\nAUTH_PASSWORD=${dto.authPassword ?? ''}\n\n# JWT — secrets autogenerados al momento de crear el servicio\nJWT_SECRET=${jwtSecret}\nJWT_EXPIRES_IN=${expiresIn}\nJWT_REFRESH_SECRET=${jwtRefSecret}\nJWT_REFRESH_EXPIRES_IN=${refreshIn}\n`);
    fs.writeFileSync(path.join(dir, '.env.example'), `# ${name} — Auth Service\n# Generated by Jarvis Platform\n\nPORT=\nNODE_ENV=development\n\nAUTH_USER=\nAUTH_PASSWORD=***REPLACE_WITH_SECRET***\n\nJWT_SECRET=***REPLACE_WITH_SECRET***\nJWT_EXPIRES_IN=${expiresIn}\nJWT_REFRESH_SECRET=***REPLACE_WITH_SECRET***\nJWT_REFRESH_EXPIRES_IN=${refreshIn}\n`);

    // Dockerfile
    fs.writeFileSync(path.join(dir, 'Dockerfile'), `# Dockerfile — ${name} (Auth Service)\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S nestjs && adduser -S nestjs -G nestjs\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /app/dist ./dist\nEXPOSE ${port}\nUSER nestjs\nHEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${port}/auth/health || exit 1\nCMD ["node", "dist/main"]\n`);
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // README
    fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}\n\n> Auth Service generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}\n\n## Endpoints\n\n| Método | Ruta | Descripción |\n|--------|------|-------------|\n| POST | /auth/login | Login — retorna access_token + refresh_token |\n| POST | /auth/refresh | Renueva el access_token con refresh_token |\n| POST | /auth/validate | Valida un token (usado por el API Gateway) |\n| POST | /auth/logout | Logout (invalida sesión del cliente) |\n| GET  | /auth/health | Estado del servicio |\n\n## Respuesta de login\n\n\`\`\`json\n{\n  "success": true,\n  "data": {\n    "access_token": "...",\n    "expires_in": "${expiresIn}",\n    "token_type": "Bearer",\n    "refresh_token": "..."\n  }\n}\n\`\`\`\n\n## Instalación\n\n\`\`\`bash\nnpm install\ncp .env.example .env\n# Editar .env con AUTH_USER, AUTH_PASSWORD y los JWT secrets\nnpm run start:dev\n\`\`\`\n`);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private isSqlServer(engine: string): boolean {
    const e = engine.toLowerCase();
    return e.includes('sql server') || e.includes('mssql') || e.includes('sqlserver');
  }

  // Convierte nombre de tabla DB → nombre de entidad camelCase singular
  // patients → patient | patient_records → patientRecord
  private tableToEntityName(table: string): string {
    let name = table.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (name.endsWith('s') && !name.endsWith('ss') && name.length > 2) name = name.slice(0, -1);
    return name.charAt(0).toLowerCase() + name.slice(1);
  }

  // Construye el string de una propiedad TypeORM decorada
  private buildTypeOrmProp(field: GenField): string {
    if (field.isPk) {
      return `  @PrimaryColumn()\n  ${field.name}!: ${field.type};`;
    }
    const opts = field.nullable ? '{ nullable: true }' : '';
    return `  @Column(${opts})\n  ${field.name}${field.nullable ? '?' : '!'}: ${field.type};`;
  }

  private pascal(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  private toOasType(t: string): string {
    const map: Record<string, string> = { string: 'string', number: 'number', boolean: 'boolean', Date: 'string', 'Record<string, any>': 'object' };
    return map[t] ?? 'string';
  }

  private zipDir(sourceDir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
