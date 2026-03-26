import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:10201'];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api');

  // Health endpoint (outside api prefix, used by Docker healthcheck)
  app.getHttpAdapter().get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  await app.listen(10200);
  console.log('Jarvis Server running on http://localhost:10200');
}
bootstrap();
