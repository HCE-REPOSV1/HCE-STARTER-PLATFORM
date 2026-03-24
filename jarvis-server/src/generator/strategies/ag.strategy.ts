import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { GenerateDto } from '../generator.interface';
import { GeneratorStrategyBase } from './strategy.base';

@Injectable()
export class AgStrategy extends GeneratorStrategyBase {
  async generate(dir: string, name: string, dto: GenerateDto): Promise<void> {
    const src      = path.join(dir, 'src');
    const svcs     = dto.gatewayServices ?? [];
    const httpPort = 10100;
    const sslPort  = dto.sslPort        ?? 20100;
    const rlTtl    = dto.rateLimitTtl   ?? 60;
    const rlMax    = dto.rateLimitMax   ?? 100;
    const timeout  = dto.requestTimeout ?? 120000;
    const certPath = dto.certPath       ?? '/app/certs';

    fs.mkdirSync(path.join(src, 'gateway'), { recursive: true });
    fs.mkdirSync(path.join(src, 'auth'),    { recursive: true });
    fs.mkdirSync(path.join(src, 'config'),  { recursive: true });

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
    fs.writeFileSync(path.join(src, 'config', 'services.config.ts'),
      `// services.config.ts — URLs de servicios backend\nexport const SERVICE_MAP: Record<string, string> = {\n${cfgEntries}\n};\n`);

    // package.json
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name, version: '1.0.0',
      scripts: { build: 'nest build', 'start:dev': 'nest start --watch', 'start:prod': 'node dist/main' },
      dependencies: {
        '@nestjs/axios': '^4.0.0', '@nestjs/common': '^11.0.0', '@nestjs/config': '^4.0.0',
        '@nestjs/core': '^11.0.0', '@nestjs/platform-express': '^11.0.0', '@nestjs/throttler': '^6.0.0',
        axios: '^1.7.0', rxjs: '^7.8.0', 'reflect-metadata': '^0.2.0',
      },
      devDependencies: {
        '@nestjs/cli': '^11.0.0', '@nestjs/schematics': '^11.0.0', typescript: '^5.3.0',
        '@types/express': '^5.0.0', '@types/node': '^22.0.0',
      },
    }, null, 2));

    this.writeBffTsConfig(dir);
    fs.writeFileSync(path.join(dir, 'nest-cli.json'), JSON.stringify({ collection: '@nestjs/schematics', sourceRoot: 'src' }, null, 2));

    // .env
    const svcEnvLines = svcs.map(s => `${s.name.replace(/-/g, '_').toUpperCase()}_URL=${s.url}`).join('\n');
    const authLine    = svcs.find(s => s.name === 'auth') ? '' : `AUTH_SERVICE_URL=http://localhost:10101\n`;
    fs.writeFileSync(path.join(dir, '.env'),
      `# ${name} — API Gateway\n# Generated by Jarvis Platform\n\nPORT=${httpPort}\nSSL_PORT=${sslPort}\nUSE_SSL=${dto.useSsl ? 'true' : 'false'}\nNODE_ENV=development\n\nCERT_PATH=${certPath}\nSERVER_NAME=${dto.serverName ?? ''}\n\nRATE_LIMIT_TTL=${rlTtl}\nRATE_LIMIT_MAX=${rlMax}\nREQUEST_TIMEOUT=${timeout}\nALLOWED_ORIGINS=${dto.allowedOrigins ?? ''}\n\n${authLine}${svcEnvLines}\n`);
    fs.writeFileSync(path.join(dir, '.env.example'),
      `# ${name} — API Gateway\n# Generated by Jarvis Platform\n\nPORT=\nSSL_PORT=\nUSE_SSL=false\nNODE_ENV=development\n\nCERT_PATH=${certPath}\nSERVER_NAME=\n\nRATE_LIMIT_TTL=${rlTtl}\nRATE_LIMIT_MAX=${rlMax}\nREQUEST_TIMEOUT=${timeout}\nALLOWED_ORIGINS=\n\n${authLine}${svcs.map(s => `${s.name.replace(/-/g, '_').toUpperCase()}_URL=`).join('\n')}\n`);

    // Dockerfile
    fs.writeFileSync(path.join(dir, 'Dockerfile'),
      `# Dockerfile — ${name} (API Gateway)\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S nestjs && adduser -S nestjs -G nestjs\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /app/dist ./dist\nVOLUME ["/app/certs"]\nEXPOSE ${httpPort} ${sslPort}\nUSER nestjs\nHEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${httpPort}/health || exit 1\nCMD ["node", "dist/main"]\n`);
    fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.env\n*.zip\n');

    // README
    const svcTable = svcs.map(s => `| /${s.name} | ${s.url} | ${s.protected ? '✓ JWT' : 'Público'} |`).join('\n');
    fs.writeFileSync(path.join(dir, 'README.md'),
      `# ${name}\n\n> API Gateway generado por **Jarvis Platform** — ${new Date().toLocaleDateString('es-PE')}\n\n## Servicios proxiados\n\n| Ruta | URL Backend | Protección |\n|------|-------------|------------|\n${svcTable}\n\n## Rate Limiting\n- Ventana: **${rlTtl}s** | Máx requests: **${rlMax}**\n\n## SSL\n- \`USE_SSL=true\` activa HTTPS en el puerto \`SSL_PORT\`\n- Coloca \`server.key\` y \`server.crt\` en la ruta definida por \`CERT_PATH\` (default: \`${certPath}\`)\n\n## Instalación\n\n\`\`\`bash\nnpm install\ncp .env.example .env\nnpm run start:dev\n\`\`\`\n`);
  }
}
