import 'reflect-metadata';
import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const origins = (process.env.CORS_ORIGINS ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  await app.listen(port, host);
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  Logger.log(`API listening on http://${displayHost}:${port}/api`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error('Failed to bootstrap API', error);
  process.exitCode = 1;
});
