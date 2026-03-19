import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:5173', credentials: true });
  app.setGlobalPrefix('api');
  await app.listen(3000);
  console.log('Jarvis Server running on http://localhost:3000');
}
bootstrap();
