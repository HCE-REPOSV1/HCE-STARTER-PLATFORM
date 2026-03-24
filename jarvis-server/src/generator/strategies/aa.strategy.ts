import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { GenerateDto } from '../generator.interface';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class AaStrategy extends GeneratorStrategyBase {
  async generate(dir: string, name: string, dto: GenerateDto): Promise<void> {
    const src      = path.join(dir, 'src');
    const authDir  = path.join(src, 'modules', 'auth');
    const port     = 10101;
    const expiresIn  = dto.jwtExpiresIn        ?? '4h';
    const refreshIn  = dto.jwtRefreshExpiresIn ?? '7d';
    const authUser   = dto.authUser            ?? 'admin';

    fs.mkdirSync(authDir, { recursive: true });

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

    const payload      = { username, roles: [], sub: 0, email: '' };
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
        passport: '^0.7.0', 'passport-jwt': '^4.0.1', rxjs: '^7.8.0', 'reflect-metadata': '^0.2.0',
      },
      devDependencies: {
        '@nestjs/cli': '^11.0.0', '@nestjs/schematics': '^11.0.0', typescript: '^5.3.0',
        '@types/express': '^5.0.0', '@types/node': '^22.0.0', '@types/passport-jwt': '^4.0.1',
      },
    }, null, 2));

    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    // .env — JWT secrets autogenerados
    const jwtSecret    = crypto.randomBytes(64).toString('hex');
    const jwtRefSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(path.join(dir, '.env'),
      `# ${name} — Auth Service\n# Generated by Jarvis Platform\n\nPORT=${port}\nNODE_ENV=development\n\n# Credenciales fijas — CAMBIAR EN PRODUCCIÓN\nAUTH_USER=${authUser}\nAUTH_PASSWORD=${dto.authPassword ?? ''}\n\n# JWT — secrets autogenerados al momento de crear el servicio\nJWT_SECRET=${jwtSecret}\nJWT_EXPIRES_IN=${expiresIn}\nJWT_REFRESH_SECRET=${jwtRefSecret}\nJWT_REFRESH_EXPIRES_IN=${refreshIn}\n`);
    fs.writeFileSync(path.join(dir, '.env.example'),
      `# ${name} — Auth Service\n# Generated by Jarvis Platform\n\nPORT=\nNODE_ENV=development\n\nAUTH_USER=\nAUTH_PASSWORD=***REPLACE_WITH_SECRET***\n\nJWT_SECRET=***REPLACE_WITH_SECRET***\nJWT_EXPIRES_IN=${expiresIn}\nJWT_REFRESH_SECRET=***REPLACE_WITH_SECRET***\nJWT_REFRESH_EXPIRES_IN=${refreshIn}\n`);

    // Dockerfile
    fs.writeFileSync(path.join(dir, 'Dockerfile'),
      `# Dockerfile — ${name} (Auth Service)\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S nestjs && adduser -S nestjs -G nestjs\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /app/dist ./dist\nEXPOSE ${port}\nUSER nestjs\nHEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${port}/auth/health || exit 1\nCMD ["node", "dist/main"]\n`);
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // README
    fs.writeFileSync(path.join(dir, 'README.md'),
      `# ${name}\n\n> Auth Service generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}\n\n## Endpoints\n\n| Método | Ruta | Descripción |\n|--------|------|-------------|\n| POST | /auth/login | Login — retorna access_token + refresh_token |\n| POST | /auth/refresh | Renueva el access_token con refresh_token |\n| POST | /auth/validate | Valida un token (usado por el API Gateway) |\n| POST | /auth/logout | Logout (invalida sesión del cliente) |\n| GET  | /auth/health | Estado del servicio |\n\n## Respuesta de login\n\n\`\`\`json\n{\n  "success": true,\n  "data": {\n    "access_token": "...",\n    "expires_in": "${expiresIn}",\n    "token_type": "Bearer",\n    "refresh_token": "..."\n  }\n}\n\`\`\`\n\n## Instalación\n\n\`\`\`bash\nnpm install\ncp .env.example .env\n# Editar .env con AUTH_USER, AUTH_PASSWORD y los JWT secrets\nnpm run start:dev\n\`\`\`\n`);
  }
}
