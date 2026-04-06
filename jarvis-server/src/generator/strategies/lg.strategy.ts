import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DatasourceService } from '../../datasource/datasource.service';
import type { GenerateDto } from '../generator.interface';
import { DbEngineResolver } from '../db-engine-resolver';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class LgStrategy extends GeneratorStrategyBase {
  constructor(private readonly datasourceService: DatasourceService) {
    super();
  }

  async generate(dir: string, name: string, dto: GenerateDto): Promise<void> {
    const src        = path.join(dir, 'src');
    const entitiesDir = path.join(src, 'entities');
    const auditDir   = path.join(src, 'audit');
    const configDir  = path.join(src, 'config');

    const broker   = dto.kafkaBroker ?? 'localhost:9092';
    const topic    = dto.kafkaTopic  ?? 'platform.logs';
    const storage  = dto.logStorage  ?? 'postgres';
    const httpPort = dto.logPort     ?? 10400;

    // Detectar motor de BD desde el datasource seleccionado
    const { engine: dbEngine, instanceName } =
      new DbEngineResolver(this.datasourceService).resolve(dto);

    // Credenciales del datasource (si hay uno seleccionado)
    let dsHost = 'localhost';
    let dsPort = dbEngine === 'mssql' ? 1433 : dbEngine === 'mysql' ? 3306 : 5432;
    let dsUser = '';
    let dsPass = '';
    let dsName = 'audit_db';
    let dsInstance = instanceName ?? '';
    if (dto.datasourceId) {
      try {
        const ds = this.datasourceService.findOne(dto.datasourceId);
        dsHost     = ds.host     ?? dsHost;
        dsPort     = ds.port     ?? dsPort;
        dsUser     = ds.username ?? '';
        dsPass     = ds.password ?? '';
        dsName     = ds.database ?? dsName;
        dsInstance = ds.instanceName ?? dsInstance;
      } catch { /* datasource not found — keep defaults */ }
    }

    fs.mkdirSync(entitiesDir, { recursive: true });
    fs.mkdirSync(auditDir,    { recursive: true });
    fs.mkdirSync(configDir,   { recursive: true });

    // ── main.ts ───────────────────────────────────────────────────
    fs.writeFileSync(path.join(src, 'main.ts'), `import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: '${name}-consumer',
        brokers:  (process.env.KAFKA_BROKER ?? '${broker}').split(','),
      },
      consumer: { groupId: '${name}-group' },
    },
  });

  app.enableCors();
  await app.startAllMicroservices();
  const port = process.env.PORT ?? ${httpPort};
  await app.listen(port);
  console.log(\`[${name}] HTTP:  http://localhost:\${port}/audit\`);
  console.log(\`[${name}] Kafka: \${process.env.KAFKA_BROKER ?? '${broker}'} → topic:\${process.env.KAFKA_TOPIC ?? '${topic}'}\`);
}
bootstrap();
`);

    // ── config/db.config.ts ───────────────────────────────────────
    const entityImports = [
      `import { UserEntity }  from '../entities/user.entity';`,
      `import { AuthSession } from '../entities/auth-session.entity';`,
      `import { AuthToken }   from '../entities/auth-token.entity';`,
      `import { AuditEvent }  from '../entities/audit-event.entity';`,
      `import { AuditTrace }  from '../entities/audit-trace.entity';`,
    ].join('\n');

    const entityList = `[UserEntity, AuthSession, AuthToken, AuditEvent, AuditTrace]`;

    // TypeORM timestamp type por motor de BD
    const tsType = dbEngine === 'mssql' ? 'datetimeoffset' : dbEngine === 'mysql' ? 'datetime' : 'timestamptz';

    let dbConfigBody: string;
    if (dbEngine === 'mssql') {
      const instLine = dsInstance
        ? `      instanceName: cfg.get<string>('DB_INSTANCE', '${dsInstance}'),`
        : `      instanceName: cfg.get<string>('DB_INSTANCE') || undefined,`;
      dbConfigBody = `  return {
    type:     'mssql',
    host:     cfg.get<string>('DB_HOST', 'localhost'),
    port:     cfg.get<number>('DB_PORT', 1433),
    username: cfg.get<string>('DB_USER'),
    password: cfg.get<string>('DB_PASS'),
    database: cfg.get<string>('DB_NAME', 'audit_db'),
    options: {
      encrypt:                false,
      trustServerCertificate: true,
      connectTimeout:         30000,
${instLine}
    },
    pool: { max: 25, min: 0 },
    entities: ${entityList},
    // synchronize: true crea las tablas automáticamente en dev.
    // En producción usar migraciones TypeORM.
    synchronize: cfg.get('NODE_ENV') !== 'production',
    logging: cfg.get('NODE_ENV') === 'development',
  };`;
    } else if (dbEngine === 'mysql') {
      dbConfigBody = `  return {
    type:     'mysql',
    host:     cfg.get<string>('DB_HOST', 'localhost'),
    port:     cfg.get<number>('DB_PORT', 3306),
    username: cfg.get<string>('DB_USER'),
    password: cfg.get<string>('DB_PASS'),
    database: cfg.get<string>('DB_NAME', 'audit_db'),
    entities: ${entityList},
    synchronize: cfg.get('NODE_ENV') !== 'production',
    logging: cfg.get('NODE_ENV') === 'development',
  };`;
    } else {
      dbConfigBody = `  return {
    type:     'postgres',
    host:     cfg.get<string>('DB_HOST', 'localhost'),
    port:     cfg.get<number>('DB_PORT', 5432),
    username: cfg.get<string>('DB_USER'),
    password: cfg.get<string>('DB_PASS'),
    database: cfg.get<string>('DB_NAME', 'audit_db'),
    ssl: cfg.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    entities: ${entityList},
    synchronize: cfg.get('NODE_ENV') !== 'production',
    logging: cfg.get('NODE_ENV') === 'development',
  };`;
    }

    fs.writeFileSync(path.join(configDir, 'db.config.ts'), `// db.config.ts — Configuración de base de datos (${dbEngine})
// Las credenciales se leen desde variables de entorno en tiempo de ejecución
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
${entityImports}

export function dbConfig(cfg: ConfigService): TypeOrmModuleOptions {
${dbConfigBody}
}
`);

    // ── app.module.ts ─────────────────────────────────────────────
    fs.writeFileSync(path.join(src, 'app.module.ts'), `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from './config/db.config';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      useFactory: (cfg: ConfigService) => dbConfig(cfg),
      inject:     [ConfigService],
    }),
    AuditModule,
  ],
})
export class AppModule {}
`);

    // ════════════════════════════════════════════════════════════════
    // ENTIDADES TypeORM — mapeadas al ER model propuesto
    // ════════════════════════════════════════════════════════════════

    // ── entities/user.entity.ts ───────────────────────────────────
    fs.writeFileSync(path.join(entitiesDir, 'user.entity.ts'), `import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

/**
 * Copia denormalizada del usuario al momento del evento.
 * Permanece válida aunque el usuario sea eliminado del sistema origen.
 */
@Entity('lg_user')
export class UserEntity {
  @PrimaryColumn('uuid')
  user_id!: string;

  @Column({ length: 255 })
  username!: string;

  @Column({ length: 50, default: 'active' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
`);

    // ── entities/auth-session.entity.ts ──────────────────────────
    fs.writeFileSync(path.join(entitiesDir, 'auth-session.entity.ts'), `import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

/**
 * Sesión de autenticación.
 * Creada en LOGIN_SUCCESS, actualizada en LOGOUT.
 */
@Entity('lg_auth_session')
export class AuthSession {
  @PrimaryColumn('uuid')
  session_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column({ length: 255, nullable: true })
  token_hash?: string;

  @Column({ length: 255, nullable: true })
  refresh_token_hash?: string;

  @CreateDateColumn()
  issued_at!: Date;

  @Column({ type: '${tsType}', nullable: true })
  expires_at?: Date;

  @Column({ length: 50, default: 'active' })
  status!: string;   // active | revoked | expired
}
`);

    // ── entities/auth-token.entity.ts ────────────────────────────
    fs.writeFileSync(path.join(entitiesDir, 'auth-token.entity.ts'), `import {
  Entity, PrimaryGeneratedColumn, Column,
} from 'typeorm';

/**
 * Token individual dentro de una sesión.
 * Registrado en TOKEN_REFRESH.
 */
@Entity('lg_auth_token')
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  token_id!: string;

  @Column('uuid')
  session_id!: string;

  @Column({ length: 50 })
  token_type!: string;   // access | refresh

  @Column({ length: 255, nullable: true })
  token_hash?: string;

  @Column({ type: '${tsType}', nullable: true })
  expires_at?: Date;
}
`);

    // ── entities/audit-event.entity.ts ───────────────────────────
    fs.writeFileSync(path.join(entitiesDir, 'audit-event.entity.ts'), `import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Registro central de auditoría.
 * Todos los eventos de todos los microservicios llegan aquí.
 */
@Entity('lg_audit_event')
@Index(['user_id'])
@Index(['trace_id'])
@Index(['event_type'])
@Index(['timestamp'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  event_id!: string;

  @Column({ length: 100 })
  event_type!: string;   // LOGIN_SUCCESS | LOGIN_FAILED | GATEWAY_REQUEST | SERVICE_CALL | LOGOUT | TOKEN_REFRESH

  @Column({ length: 255, nullable: true })
  user_id?: string;

  @Column({ length: 255, nullable: true })
  username?: string;

  @Column({ length: 500, nullable: true })
  action?: string;

  @Column({ length: 50, nullable: true })
  outcome?: string;      // SUCCESS | FAILED | ERROR

  @Column({ length: 255, nullable: true })
  source_system?: string;

  @Column({ length: 100, nullable: true })
  ip_address?: string;

  @Column({ length: 500, nullable: true })
  user_agent?: string;

  @Column({ length: 100, nullable: true })
  trace_id?: string;

  // payload_encrypted: en producción cifrar con AES-256 antes de persistir.
  // Por ahora se almacena como JSON plano. Ver: crypto.createCipheriv()
  @Column({ type: 'text', nullable: true })
  payload_encrypted?: string;

  @CreateDateColumn({ type: '${tsType}' })
  timestamp!: Date;
}
`);

    // ── entities/audit-trace.entity.ts ───────────────────────────
    fs.writeFileSync(path.join(entitiesDir, 'audit-trace.entity.ts'), `import {
  Entity, PrimaryColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Traza distribuida de un request a través de múltiples microservicios.
 * Permite correlacionar todos los AUDIT_EVENT de una misma operación.
 */
@Entity('lg_audit_trace')
@Index(['correlation_id'])
export class AuditTrace {
  @PrimaryColumn('uuid')
  trace_id!: string;

  @Column({ length: 255, nullable: true })
  correlation_id?: string;   // agrupa múltiples traces de una operación de negocio

  @Column({ length: 1000, nullable: true })
  request_path?: string;

  @Column({ length: 20, nullable: true })
  method?: string;

  @CreateDateColumn({ type: '${tsType}' })
  created_at!: Date;
}
`);

    // ════════════════════════════════════════════════════════════════
    // MÓDULO DE AUDIT — Consumer + Service + Controller
    // ════════════════════════════════════════════════════════════════

    // ── audit/audit.consumer.ts ───────────────────────────────────
    fs.writeFileSync(path.join(auditDir, 'audit.consumer.ts'), `import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuditService } from './audit.service';

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  constructor(private readonly auditService: AuditService) {}

  @EventPattern(process.env.KAFKA_TOPIC ?? '${topic}')
  async handleAuditEvent(@Payload() message: any): Promise<void> {
    // Kafka envuelve el mensaje en { key, value, headers, ... }
    const data = message?.value ?? message;
    try {
      await this.auditService.processEvent(
        typeof data === 'string' ? JSON.parse(data) : data,
      );
    } catch (err: any) {
      this.logger.error(\`Error procesando evento: \${err?.message}\`, err?.stack);
    }
  }
}
`);

    // ── audit/audit.service.ts ────────────────────────────────────
    fs.writeFileSync(path.join(auditDir, 'audit.service.ts'), `import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { UserEntity }  from '../entities/user.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { AuthToken }   from '../entities/auth-token.entity';
import { AuditEvent }  from '../entities/audit-event.entity';
import { AuditTrace }  from '../entities/audit-trace.entity';
import { randomUUID }  from 'crypto';

export interface AuditEventData {
  event_type:    string;
  source_system?: string;
  trace_id?:     string;
  user_id?:      string;
  username?:     string;
  session_id?:   string;
  action?:       string;
  outcome?:      string;
  level?:        string;
  message?:      string;
  ip_address?:   string;
  user_agent?:   string;
  reason?:       string;
  payload?:      Record<string, any>;
  timestamp?:    string;
  // campos específicos de gateway
  request_path?: string;
  method?:       string;
  correlation_id?: string;
  // campos específicos de token
  token_type?:   string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(UserEntity)  private readonly userRepo:    Repository<UserEntity>,
    @InjectRepository(AuthSession) private readonly sessionRepo: Repository<AuthSession>,
    @InjectRepository(AuthToken)   private readonly tokenRepo:   Repository<AuthToken>,
    @InjectRepository(AuditEvent)  private readonly eventRepo:   Repository<AuditEvent>,
    @InjectRepository(AuditTrace)  private readonly traceRepo:   Repository<AuditTrace>,
  ) {}

  /**
   * Punto de entrada principal.
   * Siempre guarda en AUDIT_EVENT y luego enruta a tablas específicas.
   */
  async processEvent(data: AuditEventData): Promise<void> {
    await this.saveAuditEvent(data);

    const type = data.event_type?.toUpperCase() ?? '';

    if (type === 'LOGIN_SUCCESS') {
      await this.handleLoginSuccess(data);
    } else if (type === 'LOGIN_FAILED') {
      await this.handleLoginFailed(data);
    } else if (type === 'LOGOUT') {
      await this.handleLogout(data);
    } else if (type === 'TOKEN_REFRESH') {
      await this.handleTokenRefresh(data);
    } else if (type === 'GATEWAY_REQUEST') {
      await this.handleGatewayRequest(data);
    }
    // SERVICE_CALL y otros solo van a AUDIT_EVENT (ya guardado arriba)
  }

  // ── Handlers por event_type ──────────────────────────────────────

  private async handleLoginSuccess(data: AuditEventData): Promise<void> {
    // Upsert USER — registra o actualiza el usuario
    if (data.user_id && data.username) {
      await this.userRepo.upsert(
        { user_id: data.user_id, username: data.username, status: 'active' },
        ['user_id'],
      );
    }
    // Crear AUTH_SESSION
    if (data.session_id) {
      await this.sessionRepo.upsert(
        {
          session_id: data.session_id,
          user_id:    data.user_id ?? 'unknown',
          status:     'active',
        },
        ['session_id'],
      );
    }
  }

  private async handleLoginFailed(data: AuditEventData): Promise<void> {
    // Solo registrar si conocemos al usuario (puede ser usuario inexistente)
    if (data.user_id && data.username) {
      await this.userRepo.upsert(
        { user_id: data.user_id, username: data.username, status: 'active' },
        ['user_id'],
      );
    }
  }

  private async handleLogout(data: AuditEventData): Promise<void> {
    if (data.session_id) {
      await this.sessionRepo.update(
        { session_id: data.session_id },
        { status: 'revoked' },
      );
    }
  }

  private async handleTokenRefresh(data: AuditEventData): Promise<void> {
    if (data.session_id) {
      await this.tokenRepo.save({
        token_id:   randomUUID(),
        session_id: data.session_id,
        token_type: data.token_type ?? 'access',
      });
    }
  }

  private async handleGatewayRequest(data: AuditEventData): Promise<void> {
    // Crear AUDIT_TRACE si tiene trace_id
    if (data.trace_id) {
      await this.traceRepo.upsert(
        {
          trace_id:       data.trace_id,
          correlation_id: data.correlation_id,
          request_path:   data.action ?? data.request_path,
          method:         data.method,
        },
        ['trace_id'],
      );
    }
  }

  // ── Persistencia central ─────────────────────────────────────────

  private async saveAuditEvent(data: AuditEventData): Promise<void> {
    const payload = data.payload ?? {};
    // TODO producción: cifrar payload con AES-256 antes de persistir
    // import { createCipheriv, randomBytes } from 'crypto';
    const payloadStr = Object.keys(payload).length > 0
      ? JSON.stringify(payload)
      : undefined;

    await this.eventRepo.save({
      event_type:        data.event_type,
      user_id:           data.user_id,
      username:          data.username,
      action:            data.action     ?? data.message,
      outcome:           data.outcome,
      source_system:     data.source_system,
      ip_address:        data.ip_address,
      user_agent:        data.user_agent,
      trace_id:          data.trace_id,
      payload_encrypted: payloadStr,
    });
  }

  // ── Consultas HTTP ───────────────────────────────────────────────

  async findEvents(filters: {
    userId?:      string;
    username?:    string;
    eventType?:   string;
    outcome?:     string;
    sourceSystem?: string;
    traceId?:     string;
    from?:        string;
    to?:          string;
    limit?:       number;
  }): Promise<AuditEvent[]> {
    const where: any = {};
    if (filters.userId)       where.user_id       = filters.userId;
    if (filters.username)     where.username       = filters.username;
    if (filters.eventType)    where.event_type     = filters.eventType;
    if (filters.outcome)      where.outcome        = filters.outcome;
    if (filters.sourceSystem) where.source_system  = filters.sourceSystem;
    if (filters.traceId)      where.trace_id       = filters.traceId;
    if (filters.from && filters.to) {
      where.timestamp = Between(new Date(filters.from), new Date(filters.to));
    }
    const opts: FindManyOptions<AuditEvent> = {
      where,
      order: { timestamp: 'DESC' },
      take:  Math.min(filters.limit ?? 200, 1000),
    };
    return this.eventRepo.find(opts);
  }

  async findTrace(traceId: string): Promise<{ trace: AuditTrace | null; events: AuditEvent[] }> {
    const [trace, events] = await Promise.all([
      this.traceRepo.findOne({ where: { trace_id: traceId } }),
      this.eventRepo.find({ where: { trace_id: traceId }, order: { timestamp: 'ASC' } }),
    ]);
    return { trace, events };
  }

  async findSession(sessionId: string): Promise<{ session: AuthSession | null; events: AuditEvent[]; tokens: AuthToken[] }> {
    const [session, events, tokens] = await Promise.all([
      this.sessionRepo.findOne({ where: { session_id: sessionId } }),
      this.eventRepo.find({ where: { user_id: sessionId }, order: { timestamp: 'ASC' } }),
      this.tokenRepo.find({ where: { session_id: sessionId } }),
    ]);
    return { session, events, tokens };
  }

  health(): Record<string, any> {
    return { status: 'UP', service: '${name}', timestamp: new Date().toISOString() };
  }
}
`);

    // ── audit/audit.controller.ts ─────────────────────────────────
    fs.writeFileSync(path.join(auditDir, 'audit.controller.ts'), `import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit/events
   * Filtros: userId, username, eventType, outcome, sourceSystem, traceId, from, to, limit
   */
  @Get('events')
  findEvents(
    @Query('userId')       userId?:       string,
    @Query('username')     username?:     string,
    @Query('eventType')    eventType?:    string,
    @Query('outcome')      outcome?:      string,
    @Query('sourceSystem') sourceSystem?: string,
    @Query('traceId')      traceId?:      string,
    @Query('from')         from?:         string,
    @Query('to')           to?:           string,
    @Query('limit')        limit?:        string,
  ) {
    return this.auditService.findEvents({
      userId, username, eventType, outcome, sourceSystem, traceId, from, to,
      limit: limit ? Number(limit) : 200,
    });
  }

  /**
   * GET /audit/trace/:traceId
   * Devuelve la traza completa: AUDIT_TRACE + todos los AUDIT_EVENT con ese trace_id
   */
  @Get('trace/:traceId')
  findTrace(@Param('traceId') traceId: string) {
    return this.auditService.findTrace(traceId);
  }

  /**
   * GET /audit/session/:sessionId
   * Devuelve la sesión: AUTH_SESSION + eventos + tokens
   */
  @Get('session/:sessionId')
  findSession(@Param('sessionId') sessionId: string) {
    return this.auditService.findSession(sessionId);
  }

  @Get('health')
  health() {
    return this.auditService.health();
  }
}
`);

    // ── audit/audit.module.ts ─────────────────────────────────────
    fs.writeFileSync(path.join(auditDir, 'audit.module.ts'), `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity }   from '../entities/user.entity';
import { AuthSession }  from '../entities/auth-session.entity';
import { AuthToken }    from '../entities/auth-token.entity';
import { AuditEvent }   from '../entities/audit-event.entity';
import { AuditTrace }   from '../entities/audit-trace.entity';
import { AuditConsumer }    from './audit.consumer';
import { AuditController }  from './audit.controller';
import { AuditService }     from './audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      AuthSession,
      AuthToken,
      AuditEvent,
      AuditTrace,
    ]),
  ],
  controllers: [AuditConsumer, AuditController],
  providers:   [AuditService],
})
export class AuditModule {}
`);

    // ── package.json ──────────────────────────────────────────────
    const dbDeps: Record<string, string> =
      dbEngine === 'mssql'  ? { 'mssql': '^10.0.0', 'tedious': '^18.0.0' } :
      dbEngine === 'mysql'  ? { 'mysql2': '^3.0.0' }
                            : { 'pg': '^8.0.0' };

    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name, version: '1.0.0',
      scripts: {
        start:       'node dist/main',
        build:       'tsc -p tsconfig.json',
        'start:dev': 'ts-node -r tsconfig-paths/register src/main.ts',
      },
      dependencies: {
        '@nestjs/common':           '^10.0.0',
        '@nestjs/core':             '^10.0.0',
        '@nestjs/config':           '^3.0.0',
        '@nestjs/microservices':    '^10.0.0',
        '@nestjs/platform-express': '^10.0.0',
        '@nestjs/typeorm':          '^10.0.0',
        'typeorm':                  '^0.3.0',
        ...dbDeps,
        'kafkajs':                  '^2.2.0',
        'reflect-metadata':         '^0.1.13',
        'rxjs':                     '^7.8.0',
      },
      devDependencies: {
        typescript:        '^5.0.0',
        'ts-node':         '^10.0.0',
        'tsconfig-paths':  '^4.0.0',
        '@types/node':     '^20.0.0',
      },
    }, null, 2));

    this.writeBffTsConfig(dir);
    fs.writeFileSync(
      path.join(dir, 'nest-cli.json'),
      JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2),
    );

    // ── .env ──────────────────────────────────────────────────────
    const dbLabel = dbEngine === 'mssql' ? 'SQL Server' : dbEngine === 'mysql' ? 'MySQL' : 'PostgreSQL';
    const instanceLine = (dbEngine === 'mssql' && dsInstance) ? `DB_INSTANCE=${dsInstance}\n` : '';
    fs.writeFileSync(path.join(dir, '.env'), `# ${name} — Audit Logger Service
# Generated by Jarvis Platform

PORT=${httpPort}
NODE_ENV=development

# Kafka
KAFKA_BROKER=${broker}
KAFKA_TOPIC=${topic}

# IP o hostname de este servidor — anunciado a clientes externos (AA, AG en otros servers)
# En producción cambiar a la IP real: ej. 192.168.1.100
KAFKA_EXTERNAL_HOST=localhost

# ${dbLabel} — base de datos de auditoría
# Las tablas se crean automáticamente en el primer arranque (synchronize=true en dev)
DB_HOST=${dsHost}
DB_PORT=${dsPort}
DB_USER=${dsUser}
DB_PASS=${dsPass}
DB_NAME=${dsName}
${instanceLine}`);

    fs.writeFileSync(path.join(dir, '.env.example'), `# ${name} — Audit Logger Service
# Generated by Jarvis Platform

PORT=${httpPort}
NODE_ENV=development

# Kafka
KAFKA_BROKER=
KAFKA_TOPIC=${topic}

# ${dbLabel}
DB_HOST=
DB_PORT=${dsPort}
DB_USER=
DB_PASS=
DB_NAME=audit_db
${dbEngine === 'mssql' ? 'DB_INSTANCE=\n' : ''}`);

    // ── Dockerfile ────────────────────────────────────────────────
    fs.writeFileSync(path.join(dir, 'Dockerfile'), `# Dockerfile — ${name} (Audit Logger)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE ${httpPort}
USER nestjs
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${httpPort}/audit/health || exit 1
CMD ["node", "dist/main"]
`);
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // ── docker-compose.yml ────────────────────────────────────────
    const dbServiceYml = dbEngine === 'mssql' ? '' : dbEngine === 'mysql'
      ? `
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: \${DB_PASS:-root}
      MYSQL_DATABASE: \${DB_NAME:-audit_db}
      MYSQL_USER: \${DB_USER:-audit}
      MYSQL_PASSWORD: \${DB_PASS:-root}
    ports:
      - "\${DB_PORT:-3306}:3306"
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
`
      : `
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: \${DB_USER:-audit}
      POSTGRES_PASSWORD: \${DB_PASS:-audit}
      POSTGRES_DB: \${DB_NAME:-audit_db}
    ports:
      - "\${DB_PORT:-5432}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-audit}"]
      interval: 10s
      timeout: 5s
      retries: 5
`;

    const dbHostInCompose = dbEngine === 'mssql'
      ? `\${DB_HOST:-${dsHost || 'host.docker.internal'}}`
      : 'db';

    const dbDependsOn = dbEngine === 'mssql' ? '' : `
      - db`;

    const dbVolume = dbEngine === 'mssql' ? '' : `
  db_data:`;

    const mssqlNote = dbEngine === 'mssql'
      ? `\n      # SQL Server corre fuera de este compose — apunta a DB_HOST en .env`
      : '';

    fs.writeFileSync(path.join(dir, 'docker-compose.yml'), `# docker-compose.yml — ${name}
# Uso: docker compose up -d  |  docker compose down  |  docker compose build

services:

  kafka:
    image: apache/kafka:latest
    environment:
      KAFKA_NODE_ID: "1"
      KAFKA_PROCESS_ROLES: broker,controller
      # PLAINTEXT     → red Docker interna (LG container, mismo server)
      # PLAINTEXT_EXT → acceso externo desde otros servidores/microservicios
      KAFKA_LISTENERS: PLAINTEXT://:9092,PLAINTEXT_EXT://:9093,CONTROLLER://:9094
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_EXT://\${KAFKA_EXTERNAL_HOST:-localhost}:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_EXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9094
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: "1"
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKAJS_NO_PARTITIONER_WARNING: "1"
    ports:
      - "9092:9092"   # red Docker interna
      - "9093:9093"   # acceso externo (otros servers/microservicios)
    volumes:
      - kafka_data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD-SHELL", "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s
${dbServiceYml}
  ${name}:
    build: .
    ports:
      - "\${PORT:-${httpPort}}:\${PORT:-${httpPort}}"
    env_file: .env
    environment:
      NODE_ENV: production
      KAFKA_BROKER: kafka:9092${mssqlNote}
      DB_HOST: ${dbHostInCompose}
    depends_on:
      kafka:
        condition: service_healthy${dbDependsOn}
    restart: unless-stopped

volumes:
  kafka_data:${dbVolume}
`);

    // ── README ────────────────────────────────────────────────────
    fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}

> Audit Logger Service generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}

## Modelo de datos

\`\`\`
lg_user          — copia denormalizada del usuario
lg_auth_session  — sesiones de autenticación
lg_auth_token    — tokens por sesión
lg_audit_event   — registro central de todos los eventos ← tabla principal
lg_audit_trace   — trazas distribuidas entre microservicios
\`\`\`

## Routing de eventos Kafka

| event_type | lg_audit_event | lg_user | lg_auth_session | lg_auth_token | lg_audit_trace |
|------------|:-:|:-:|:-:|:-:|:-:|
| LOGIN_SUCCESS | ✓ | upsert | crear | — | — |
| LOGIN_FAILED  | ✓ | — | — | — | — |
| LOGOUT        | ✓ | — | status=revoked | — | — |
| TOKEN_REFRESH | ✓ | — | — | crear | — |
| GATEWAY_REQUEST | ✓ | — | — | — | upsert |
| SERVICE_CALL  | ✓ | — | — | — | — |

## Endpoints HTTP

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /audit/events | Consultar eventos (filtros: userId, username, eventType, outcome, sourceSystem, traceId, from, to, limit) |
| GET | /audit/trace/:traceId | Traza completa — todos los eventos de un request |
| GET | /audit/session/:sessionId | Sesión + eventos + tokens |
| GET | /audit/health | Health check |

## Ejemplos de consulta

\`\`\`bash
# Todos los logins fallidos de las últimas 24h
GET /audit/events?eventType=LOGIN_FAILED&from=2024-01-01T00:00:00Z

# Seguir un request a través de todos los microservicios
GET /audit/trace/abc-123-uuid

# Ver sesión de un usuario
GET /audit/session/session-uuid-aqui

# Eventos de un usuario específico
GET /audit/events?userId=user-uuid&limit=50
\`\`\`

## Instalación

\`\`\`bash
npm install
cp .env.example .env
# Configurar DB_HOST, DB_USER, DB_PASS, DB_NAME
# Las tablas se crean automáticamente en el primer arranque
npm run start:dev
\`\`\`

## payload_encrypted

Actualmente el payload se guarda como JSON plano.
Para cumplir con GDPR/HIPAA, cifrar en \`audit.service.ts → saveAuditEvent()\`
usando \`crypto.createCipheriv('aes-256-gcm', key, iv)\`.
`);
  }
}
