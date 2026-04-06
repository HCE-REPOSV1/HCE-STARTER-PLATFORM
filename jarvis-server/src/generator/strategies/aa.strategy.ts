import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { GenerateDto } from '../generator.interface';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class AaStrategy extends GeneratorStrategyBase {
  async generate(dir: string, name: string, dto: GenerateDto): Promise<void> {
    const src            = path.join(dir, 'src');
    const authDir        = path.join(src, 'modules', 'auth');
    const port           = 10101;
    const expiresIn      = dto.jwtExpiresIn        ?? '4h';
    const refreshIn      = dto.jwtRefreshExpiresIn ?? '7d';
    const authUser       = dto.authUser            ?? 'admin';
    const externalAuth   = dto.externalAuthUrl ?? '';
    const withExternal   = externalAuth.length > 0;
    const withLogs       = dto.observability?.logs === true;
    const broker         = dto.kafkaBroker ?? 'localhost:9092';
    const topic          = dto.kafkaTopic  ?? 'platform.logs';
    const loggerDir      = path.join(src, 'logger');

    fs.mkdirSync(authDir, { recursive: true });
    if (withLogs) fs.mkdirSync(loggerDir, { recursive: true });

    // ── main.ts ───────────────────────────────────────────────────
    fs.writeFileSync(path.join(src, 'main.ts'), `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app  = await NestFactory.create(AppModule);
  app.enableCors();
  const port = Number(process.env.PORT ?? ${port});
  await app.listen(port);
  console.log(\`🔐 ${name} running on http://localhost:\${port}\`);
}
bootstrap();
`);

    // ── app.module.ts ─────────────────────────────────────────────
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

    // ── auth.module.ts ────────────────────────────────────────────
    const httpModuleImport = withExternal ? `import { HttpModule } from '@nestjs/axios';\n` : '';
    const httpModuleReg    = withExternal ? `\n    HttpModule.register({ timeout: 5000 }),` : '';
    const daoProvider      = withExternal ? `AuthDao, ExternalAuthDao` : `AuthDao`;
    const daoImport        = withExternal
      ? `import { AuthDao } from './auth.dao';\nimport { ExternalAuthDao } from './external-auth.dao';`
      : `import { AuthDao } from './auth.dao';`;
    const kafkaModImport   = withLogs ? `\nimport { KafkaLoggerModule } from '../../logger/kafka-logger.module';` : '';
    const kafkaModReg      = withLogs ? `\n    KafkaLoggerModule,` : '';

    fs.writeFileSync(path.join(authDir, 'auth.module.ts'), `import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
${httpModuleImport}import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
${daoImport}${kafkaModImport}

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN', '${expiresIn}') as any },
      }),
      inject: [ConfigService],
    }),${httpModuleReg}${kafkaModReg}
  ],
  controllers: [AuthController],
  providers: [AuthService, ${daoProvider}],
})
export class AuthModule {}
`);

    // ── user-info.interface.ts ────────────────────────────────────
    fs.writeFileSync(path.join(authDir, 'user-info.interface.ts'), `// Contrato común que deben retornar todos los DAOs de autenticación.
// Mapea los campos necesarios para el JWT de audit.
export interface UserInfo {
  userId:   string;   // → JWT: sub  (para AUDIT_EVENT.user_id)
  username: string;   // → JWT: username
  roles:    string[]; // → JWT: roles
  email:    string;
  macToken?: string;  // Token del proveedor externo (MAC, etc.) — se embebe en JWT como claim privado
  perfil?:  string;   // IdPerfil de MAC — necesario para /obtenerAccesos
}
`);

    // ── auth.controller.ts ────────────────────────────────────────
    const externalEndpoints = withExternal ? `
  @Get('accesos')
  getAccesos(@Headers('authorization') authHeader: string) {
    return this.authService.getAccesos(extractBearer(authHeader));
  }

  @Post('cambiar-contrasena')
  cambiarContrasena(
    @Headers('authorization') authHeader: string,
    @Body() body: { actualContrasena: string; nuevaContrasena: string },
  ) {
    return this.authService.cambiarContrasena(extractBearer(authHeader), body.actualContrasena, body.nuevaContrasena);
  }
` : '';

    fs.writeFileSync(path.join(authDir, 'auth.controller.ts'), `import { Controller, Post, Get, Body, Headers, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

function extractBearer(authHeader: string | undefined): string {
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
  return authHeader.replace('Bearer ', '').trim();
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { username: string; password: string }, @Req() req: Request) {
    return this.authService.login(body.username, body.password, {
      ip:        (req.headers['x-forwarded-for'] as string) ?? req.ip,
      userAgent: req.headers['user-agent'],
      traceId:   req.headers['x-trace-id'] as string,
    });
  }

  @Post('refresh')
  refresh(@Body() body: { refresh_token: string }, @Req() req: Request) {
    return this.authService.refresh(body.refresh_token, {
      traceId: req.headers['x-trace-id'] as string,
    });
  }

  @Post('validate')
  validate(@Headers('authorization') authHeader: string) {
    return this.authService.validateToken(extractBearer(authHeader));
  }

  @Post('logout')
  logout(@Headers('authorization') authHeader: string, @Req() req: Request) {
    const token = extractBearer(authHeader);
    return this.authService.cerrarSesionMac(token, { traceId: req.headers['x-trace-id'] as string });
  }
${externalEndpoints}
  @Get('health')
  health() {
    return { status: 'OK', service: '${name}', timestamp: new Date().toISOString() };
  }
}
`);

    // ── auth.service.ts ───────────────────────────────────────────
    const daoServiceImport = withExternal
      ? `import { ExternalAuthDao } from './external-auth.dao';`
      : `import { AuthDao } from './auth.dao';`;
    const kafkaServiceImport = withLogs
      ? `\nimport { KafkaLoggerService } from '../../logger/kafka-logger.service';` : '';
    const kafkaConstructorParam = withLogs
      ? `\n    private readonly kafkaLogger: KafkaLoggerService,` : '';

    fs.writeFileSync(path.join(authDir, 'auth.service.ts'), `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
${daoServiceImport}${kafkaServiceImport}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt:    JwtService,
    private readonly config: ConfigService,
    private readonly dao:    ${withExternal ? 'ExternalAuthDao' : 'AuthDao'},${kafkaConstructorParam}
  ) {}

  async login(username: string, password: string, context?: { ip?: string; userAgent?: string; traceId?: string }) {
    // ── Intento de login — registrar ANTES de validar ────────────
${withLogs ? `    const attemptTraceId = context?.traceId ?? randomUUID();` : `    const attemptTraceId = randomUUID();`}

    try {
      const user = await this.dao.validateUser(username, password);
      if (!user) {
${withLogs ? `        await this.kafkaLogger.log({
          event_type: 'LOGIN_FAILED',
          level:      'WARN',
          trace_id:   attemptTraceId,
          username,
          action:     'LOGIN',
          outcome:    'FAILED',
          reason:     'INVALID_CREDENTIALS',
          ip_address: context?.ip,
          user_agent: context?.userAgent,
        });` : ''}
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const sessionId = randomUUID();
      const payload   = {
        sub:       user.userId,
        username:  user.username,
        roles:     user.roles,
        email:     user.email,
        sessionId,
        ...(user.macToken ? { mac_token: user.macToken, mac_perfil: user.perfil } : {}),
      };

      const accessToken  = this.jwt.sign(payload);
      const refreshToken = this.jwt.sign(
        { sub: user.userId, username: user.username, sessionId },
        { secret: this.config.get<string>('JWT_REFRESH_SECRET'), expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '${refreshIn}') } as any,
      );

${withLogs ? `      await this.kafkaLogger.log({
        event_type: 'LOGIN_SUCCESS',
        level:      'INFO',
        trace_id:   attemptTraceId,
        user_id:    user.userId,
        username:   user.username,
        session_id: sessionId,
        action:     'LOGIN',
        outcome:    'SUCCESS',
        ip_address: context?.ip,
        user_agent: context?.userAgent,
      });` : ''}

      return {
        success: true,
        message: 'Login successful',
        data: {
          user:          { userId: user.userId, username: user.username, roles: user.roles, email: user.email },
          access_token:  accessToken,
          expires_in:    this.config.get<string>('JWT_EXPIRES_IN', '${expiresIn}'),
          token_type:    'Bearer',
          refresh_token: refreshToken,
          session_id:    sessionId,
        },
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
${withLogs ? `      await this.kafkaLogger.log({
        event_type: 'LOGIN_FAILED',
        level:      'ERROR',
        trace_id:   attemptTraceId,
        username,
        action:     'LOGIN',
        outcome:    'ERROR',
        reason:     (err as any)?.message,
        ip_address: context?.ip,
        user_agent: context?.userAgent,
      });` : ''}
      throw err;
    }
  }

  async refresh(refreshToken: string, context?: { traceId?: string }) {
    try {
      const decoded   = this.jwt.verify(refreshToken, { secret: this.config.get<string>('JWT_REFRESH_SECRET') }) as any;
      const sessionId = decoded.sessionId ?? randomUUID();
      const payload   = { sub: decoded.sub, username: decoded.username, roles: decoded.roles ?? [], email: decoded.email ?? '', sessionId };
      const accessToken = this.jwt.sign(payload);

${withLogs ? `      await this.kafkaLogger.log({
        event_type: 'TOKEN_REFRESH',
        level:      'INFO',
        trace_id:   context?.traceId,
        user_id:    decoded.sub,
        username:   decoded.username,
        session_id: sessionId,
        action:     'TOKEN_REFRESH',
        outcome:    'SUCCESS',
      });` : ''}

      return {
        success: true, message: 'Token refreshed successfully',
        data: { access_token: accessToken, expires_in: this.config.get<string>('JWT_EXPIRES_IN', '${expiresIn}'), token_type: 'Bearer', session_id: sessionId },
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async cerrarSesionMac(token: string, context?: { traceId?: string }) {
    try {
      const d = this.jwt.verify(token) as any;
${withExternal ? `      if (d.mac_token) {
        await this.dao.cerrarSesion(d.mac_token, d.username);
      }` : ''}
${withLogs ? `      await this.kafkaLogger.log({
        event_type: 'LOGOUT',
        level:      'INFO',
        trace_id:   context?.traceId,
        user_id:    d.sub,
        username:   d.username,
        session_id: d.sessionId,
        action:     'LOGOUT',
        outcome:    'SUCCESS',
      });` : ''}
      return { success: true, message: 'Sesión cerrada correctamente' };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
${withExternal ? `
  async getAccesos(token: string) {
    try {
      const d = this.jwt.verify(token) as any;
      if (!d.mac_token) throw new UnauthorizedException('Token de sesión sin credenciales externas');
      return await this.dao.getAccesos(d.mac_token, d.mac_perfil ?? '');
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async cambiarContrasena(token: string, actualContrasena: string, nuevaContrasena: string) {
    try {
      const d = this.jwt.verify(token) as any;
      if (!d.mac_token) throw new UnauthorizedException('Token de sesión sin credenciales externas');
      const result = await this.dao.cambiarContrasena(d.mac_token, d.username, actualContrasena, nuevaContrasena);
${withLogs ? `      await this.kafkaLogger.log({
        event_type: 'PASSWORD_CHANGE',
        level:      'INFO',
        user_id:    d.sub,
        username:   d.username,
        session_id: d.sessionId,
        action:     'PASSWORD_CHANGE',
        outcome:    'SUCCESS',
      });` : ''}
      return result;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
` : ''}
  async validateToken(token: string) {
    try {
      const d = this.jwt.verify(token) as any;
      return {
        success: true, message: 'Token is valid',
        data: { userId: d.sub, username: d.username, email: d.email, roles: d.roles, sessionId: d.sessionId, exp: d.exp, iat: d.iat },
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
`);

    // ── auth.dao.ts (local — fallback sin servicio externo) ───────
    fs.writeFileSync(path.join(authDir, 'auth.dao.ts'), `import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserInfo } from './user-info.interface';

// Autenticación local contra variables de entorno.
// Reemplazar por ExternalAuthDao para delegar a un servicio externo (MAC, LDAP, etc.)
@Injectable()
export class AuthDao {
  constructor(private readonly config: ConfigService) {}

  async validateUser(username: string, password: string): Promise<UserInfo | null> {
    const validUser = this.config.get<string>('AUTH_USER',     '${authUser}');
    const validPass = this.config.get<string>('AUTH_PASSWORD', '');
    if (username !== validUser || password !== validPass) return null;
    return {
      userId:   \`local-\${username}\`,
      username,
      roles:    ['admin'],
      email:    '',
    };
  }
}
`);

    // ── external-auth.dao.ts (solo si externalAuthUrl está configurado) ──
    if (withExternal) {
      fs.writeFileSync(path.join(authDir, 'external-auth.dao.ts'), `import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  GatewayTimeoutException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import * as https from 'https';
import type { UserInfo } from './user-info.interface';

// Delega la autenticación a un servicio externo (MAC, LDAP, OAuth, etc.)
// Maneja timeout, servicio caído, certificados autofirmados y credenciales inválidas.
// El desarrollador adapta buildBody() y mapUser() al contrato del servicio externo.
@Injectable()
export class ExternalAuthDao {
  private readonly logger      = new Logger(ExternalAuthDao.name);
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY = 500;
  private readonly TIMEOUT_MS  = 5000;
  // SSL_VERIFY=false en .env para aceptar certificados autofirmados o de CA interna.
  // En producción con certificado válido dejar en true (o no definir la variable).
  private readonly httpsAgent: https.Agent;

  constructor(
    private readonly http:   HttpService,
    private readonly config: ConfigService,
  ) {
    const sslVerify = this.config.get<string>('SSL_VERIFY', 'true') !== 'false';
    this.httpsAgent = new https.Agent({ rejectUnauthorized: sslVerify });
  }

  private get baseUrl(): string {
    return this.config.get<string>('EXTERNAL_AUTH_BASE_URL', '${externalAuth}');
  }

  async validateUser(username: string, password: string): Promise<UserInfo | null> {
    const endpoint = \`\${this.baseUrl}/autenticar\`;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http
            .post(endpoint, this.buildBody(username, password), { httpsAgent: this.httpsAgent })
            .pipe(timeout({ each: this.TIMEOUT_MS })),
        );
        return this.mapUser(response.data, username);

      } catch (err: any) {
        const isLast = attempt === this.MAX_RETRIES;

        // ── Credenciales inválidas ──────────────────────────────
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          throw new UnauthorizedException('Credenciales inválidas');
        }

        // ── Timeout ────────────────────────────────────────────
        if (err instanceof TimeoutError || err?.code === 'ECONNABORTED') {
          this.logger.warn(\`Auth service timeout (attempt \${attempt + 1})\`);
          if (isLast) throw new GatewayTimeoutException('Servicio de autenticación no responde (timeout)');
          await this.delay(this.RETRY_DELAY);
          continue;
        }

        // ── Servicio caído ─────────────────────────────────────
        if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.code === 'ECONNRESET') {
          this.logger.error(\`Auth service unreachable: \${err.code}\`);
          throw new ServiceUnavailableException('Servicio de autenticación no disponible');
        }

        // ── Error HTTP del servicio externo ────────────────────
        if (err?.response?.status >= 500) {
          this.logger.warn(\`Auth service error \${err.response.status} (attempt \${attempt + 1})\`);
          if (isLast) throw new ServiceUnavailableException('Error en servicio de autenticación');
          await this.delay(this.RETRY_DELAY);
          continue;
        }

        // ── Error desconocido (incluye errores SSL) ─────────────
        this.logger.error(\`Unexpected auth error: \${err?.message}\`);
        if (isLast) throw new ServiceUnavailableException('Error inesperado en autenticación');
        await this.delay(this.RETRY_DELAY);
      }
    }
    return null;
  }

  async getAccesos(macToken: string, codigoPerfil: string): Promise<any> {
    const res = await firstValueFrom(
      this.http.post(
        \`\${this.baseUrl}/obtenerAccesos\`,
        { codigoSistema: this.config.get<string>('EXTERNAL_AUTH_SISTEMA', ''), codigoPerfil },
        { httpsAgent: this.httpsAgent, headers: { Authorization: \`bearer \${macToken}\` } },
      ).pipe(timeout({ each: this.TIMEOUT_MS })),
    );
    return res.data;
  }

  async cerrarSesion(macToken: string, codigoUsuario: string): Promise<any> {
    const res = await firstValueFrom(
      this.http.post(
        \`\${this.baseUrl}/cerrarSesion\`,
        { codigoUsuario },
        { httpsAgent: this.httpsAgent, headers: { Authorization: \`bearer \${macToken}\` } },
      ).pipe(timeout({ each: this.TIMEOUT_MS })),
    );
    return res.data;
  }

  async cambiarContrasena(macToken: string, codigoUsuario: string, actualContrasena: string, nuevaContrasena: string): Promise<any> {
    const res = await firstValueFrom(
      this.http.post(
        \`\${this.baseUrl}/cambioContrasena\`,
        {
          codigoUsuario,
          actualContrasena: this.macEncrypt(actualContrasena),
          nuevaContrasena:  this.macEncrypt(nuevaContrasena),
        },
        { httpsAgent: this.httpsAgent, headers: { Authorization: \`bearer \${macToken}\` } },
      ).pipe(timeout({ each: this.TIMEOUT_MS })),
    );
    return res.data;
  }

  /**
   * Construye el body del request según el contrato del servicio externo.
   * Adaptar los campos al contrato real del servicio.
   */
  private buildBody(username: string, password: string): Record<string, any> {
    return {
      username,
      password,
      // TODO: adaptar al contrato del servicio externo
      // Ejemplo MAC: { codigoSistema, codigoUsuario, contrasena: this.macEncrypt(password) }
    };
  }

  /**
   * Mapea la respuesta del servicio externo a UserInfo.
   * Adaptar según la estructura real de respuesta.
   * macToken: token del proveedor externo para llamar sus otros endpoints.
   */
  private mapUser(data: any, username: string): UserInfo | null {
    // Si el servicio retorna un código de error en el body (ej: MAC codigo !== 0)
    // descomentar y adaptar:
    // if (data?.codigo !== 0) return null;
    const token   = data?.data?.token?.token ?? '';
    const usuario = data?.data?.usuario ?? {};
    const perfil  = String(usuario?.idPerfil ?? '');
    return {
      userId:   usuario?.codigoUsuario ?? data.userId ?? username,
      username: (usuario?.codigoUsuario ?? data.username ?? username).toUpperCase(),
      roles:    perfil ? [perfil] : (data.roles ?? []),
      email:    usuario?.correo ?? data.email ?? '',
      macToken: token,
      perfil,
    };
  }

  /**
   * Encriptación AES-256-CBC — adaptar o eliminar si el servicio externo no requiere encriptación.
   * Equivalente a Criptography.Encrypt() en .NET (PKCS7 + Base64).
   * CRYPTO_KEY: exactamente 32 caracteres | CRYPTO_IV: exactamente 16 caracteres
   */
  private macEncrypt(text: string): string {
    try {
      const { createCipheriv } = require('crypto');
      const cryptoKey = this.config.get<string>('CRYPTO_KEY') ?? process.env['CRYPTO_KEY'] ?? '';
      const cryptoIv  = this.config.get<string>('CRYPTO_IV')  ?? process.env['CRYPTO_IV']  ?? '';
      if (!text)               throw new Error('password is empty or undefined');
      if (cryptoKey.length !== 32) throw new Error(\`CRYPTO_KEY must be 32 chars, got \${cryptoKey.length}\`);
      if (cryptoIv.length  !== 16) throw new Error(\`CRYPTO_IV must be 16 chars, got \${cryptoIv.length}\`);
      const key    = Buffer.from(cryptoKey, 'utf8');
      const iv     = Buffer.from(cryptoIv,  'utf8');
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      const encrypted = Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]);
      return encrypted.toString('base64');
    } catch (e: any) {
      this.logger.error(\`Encrypt error: \${e.message}\`);
      throw new ServiceUnavailableException('Error al procesar credenciales');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
`);
    }

    // ── Kafka Logger (opcional) ───────────────────────────────────
    if (withLogs) {
      fs.writeFileSync(path.join(loggerDir, 'kafka-logger.service.ts'), `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';

export interface AuthAuditEntry {
  event_type:  string;   // LOGIN_SUCCESS | LOGIN_FAILED | TOKEN_REFRESH | LOGOUT
  level?:      string;
  trace_id?:   string;
  user_id?:    string;
  username?:   string;
  session_id?: string;
  action?:     string;
  outcome?:    string;
  reason?:     string;   // motivo de fallo (INVALID_CREDENTIALS, TIMEOUT, etc.)
  ip_address?: string;
  user_agent?: string;
}

@Injectable()
export class KafkaLoggerService implements OnModuleInit, OnModuleDestroy {
  private producer!: Producer;

  constructor(private readonly cfg: ConfigService) {}

  async onModuleInit() {
    const kafka = new Kafka({
      clientId: '${name}-logger',
      brokers:  (this.cfg.get<string>('KAFKA_BROKER', '${broker}')).split(','),
      logLevel: logLevel.ERROR,
    });
    this.producer = kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async log(entry: AuthAuditEntry): Promise<void> {
    try {
      await this.producer.send({
        topic: this.cfg.get<string>('KAFKA_TOPIC', '${topic}'),
        messages: [{
          value: JSON.stringify({
            source_system: '${name}',
            timestamp:     new Date().toISOString(),
            ...entry,
            level: entry.level ?? 'INFO',
          }),
        }],
      });
    } catch {
      // Fire and forget — nunca interrumpe el flujo de autenticación
    }
  }
}
`);

      fs.writeFileSync(path.join(loggerDir, 'kafka-logger.module.ts'), `import { Module } from '@nestjs/common';
import { KafkaLoggerService } from './kafka-logger.service';

@Module({
  providers: [KafkaLoggerService],
  exports:   [KafkaLoggerService],
})
export class KafkaLoggerModule {}
`);
    }

    // ── package.json ──────────────────────────────────────────────
    const pkgDeps: Record<string, string> = {
      '@nestjs/common':           '^11.0.0',
      '@nestjs/config':           '^4.0.0',
      '@nestjs/core':             '^11.0.0',
      '@nestjs/jwt':              '^11.0.0',
      '@nestjs/passport':         '^11.0.0',
      '@nestjs/platform-express': '^11.0.0',
      'passport':                 '^0.7.0',
      'passport-jwt':             '^4.0.1',
      'rxjs':                     '^7.8.0',
      'reflect-metadata':         '^0.2.0',
    };
    if (withExternal) {
      pkgDeps['@nestjs/axios'] = '^4.0.0';
      pkgDeps['axios']         = '^1.7.0';
    }
    if (withLogs) {
      pkgDeps['kafkajs'] = '^2.2.0';
    }

    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name, version: '1.0.0',
      scripts: { build: 'nest build', 'start:dev': 'nest start --watch', 'start:prod': 'node dist/main' },
      dependencies: pkgDeps,
      devDependencies: {
        '@nestjs/cli': '^11.0.0', '@nestjs/schematics': '^11.0.0', typescript: '^5.3.0',
        '@types/express': '^5.0.0', '@types/node': '^22.0.0', '@types/passport-jwt': '^4.0.1',
      },
    }, null, 2));

    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    // ── .env ──────────────────────────────────────────────────────
    const jwtSecret    = crypto.randomBytes(64).toString('hex');
    const jwtRefSecret = crypto.randomBytes(64).toString('hex');
    const externalLine = withExternal
      ? `\n# Servicio externo de autenticación (MAC, LDAP, OAuth, etc.)\n# URL base del servicio — sin path final (ej: https://host:puerto/api/Seguridad)\nEXTERNAL_AUTH_BASE_URL=${externalAuth}\nEXTERNAL_AUTH_SISTEMA=\n# SSL_VERIFY=false para certificados autofirmados o CA interna\nSSL_VERIFY=false\n# AES-256-CBC — requerido si el servicio externo encripta contraseñas\n# CRYPTO_KEY: exactamente 32 caracteres | CRYPTO_IV: exactamente 16 caracteres\nCRYPTO_KEY=\nCRYPTO_IV=\n`
      : `\n# Credenciales locales — CAMBIAR EN PRODUCCIÓN\nAUTH_USER=${authUser}\nAUTH_PASSWORD=${dto.authPassword ?? ''}\n`;
    const externalLineEx = withExternal
      ? `\n# Servicio externo de autenticación\nEXTERNAL_AUTH_BASE_URL=\nEXTERNAL_AUTH_SISTEMA=\nSSL_VERIFY=true\nCRYPTO_KEY=***32_CHARS***\nCRYPTO_IV=***16_CHARS***\n`
      : `\n# Credenciales locales\nAUTH_USER=\nAUTH_PASSWORD=***REPLACE_WITH_SECRET***\n`;

    const kafkaEnv   = withLogs ? `\n# Kafka Audit Logger\nKAFKA_BROKER=${broker}\nKAFKA_TOPIC=${topic}\n` : '';
    const kafkaEnvEx = withLogs ? `\n# Kafka Audit Logger\nKAFKA_BROKER=\nKAFKA_TOPIC=${topic}\n` : '';
    fs.writeFileSync(path.join(dir, '.env'),
      `# ${name} — Auth Service\n# Generated by Jarvis Platform\n\nPORT=${port}\nNODE_ENV=development\n${externalLine}\n# JWT — secrets autogenerados\nJWT_SECRET=${jwtSecret}\nJWT_EXPIRES_IN=${expiresIn}\nJWT_REFRESH_SECRET=${jwtRefSecret}\nJWT_REFRESH_EXPIRES_IN=${refreshIn}\n${kafkaEnv}`);
    fs.writeFileSync(path.join(dir, '.env.example'),
      `# ${name} — Auth Service\n# Generated by Jarvis Platform\n\nPORT=\nNODE_ENV=development\n${externalLineEx}\n# JWT\nJWT_SECRET=***REPLACE_WITH_SECRET***\nJWT_EXPIRES_IN=${expiresIn}\nJWT_REFRESH_SECRET=***REPLACE_WITH_SECRET***\nJWT_REFRESH_EXPIRES_IN=${refreshIn}\n${kafkaEnvEx}`);

    // ── Dockerfile ────────────────────────────────────────────────
    fs.writeFileSync(path.join(dir, 'Dockerfile'),
      `# Dockerfile — ${name} (Auth Service)\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S nestjs && adduser -S nestjs -G nestjs\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /app/dist ./dist\nEXPOSE ${port}\nUSER nestjs\nHEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${port}/auth/health || exit 1\nCMD ["node", "dist/main"]\n`);
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // ── docker-compose.yml ────────────────────────────────────────
    fs.writeFileSync(path.join(dir, 'docker-compose.yml'), this.buildDockerCompose(name, port, [], '/auth/health'));

    // ── README ────────────────────────────────────────────────────
    const externalSection = withExternal ? `\n## Integración con servicio externo\n\nEl servicio delega la autenticación a \`EXTERNAL_AUTH_URL\`.\nAdaptar el método \`mapUser()\` en \`external-auth.dao.ts\` según el contrato del servicio externo.\n\n### Manejo de errores\n\n| Escenario | Comportamiento |\n|-----------|----------------|\n| Credenciales inválidas | \`401 Unauthorized\` |\n| Timeout (>5s) | \`504 Gateway Timeout\` — 1 reintento automático |\n| Servicio caído | \`503 Service Unavailable\` — sin reintentos |\n| Error 5xx del externo | \`503 Service Unavailable\` — 1 reintento (500ms) |\n` : '';

    fs.writeFileSync(path.join(dir, 'README.md'),
      `# ${name}\n\n> Auth Service generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}\n\n## JWT Payload (audit-ready)\n\n\`\`\`json\n{\n  "sub":       "uuid-del-usuario",\n  "username":  "juan.perez",\n  "roles":     ["admin", "user"],\n  "email":     "juan@empresa.com",\n  "sessionId": "uuid-de-sesion",\n  "iat": 1234567890,\n  "exp": 1234571490\n}\n\`\`\`\n\n> **sub** y **username** son leídos por el API Gateway para registrar eventos de audit.\n> **sessionId** correlaciona con AUTH_SESSION en el logger.\n${externalSection}\n## Endpoints\n\n| Método | Ruta | Auth | Descripción |\n|--------|------|------|-------------|\n| POST | /auth/login | No | Login — retorna access_token + refresh_token |\n| POST | /auth/refresh | No | Renueva el access_token |\n| POST | /auth/validate | Bearer | Valida token (usado por el API Gateway) |\n| POST | /auth/logout | Bearer | Cierra sesión (notifica al proveedor externo si aplica) |\n| GET  | /auth/accesos | Bearer | Obtiene opciones de menú del proveedor externo |\n| POST | /auth/cambiar-contrasena | Bearer | Cambia contraseña en el proveedor externo |\n| GET  | /auth/health | No | Health check |\n\n## Instalación\n\n\`\`\`bash\nnpm install\ncp .env.example .env\nnpm run start:dev\n\`\`\`\n`);
  }
}
