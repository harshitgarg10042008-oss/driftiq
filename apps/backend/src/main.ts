import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security — disable CSP in dev to allow Vite HMR; enable selectively in production
  app.use(helmet({
    contentSecurityPolicy: false, // Frontend handles CSP via meta tags; backend serves only JSON/streams
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS — allow the Vite dev server (port 3000) and any configured FRONTEND_URL
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Telegram webhooks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-bot-api-secret-token'],
  });

  // Global API prefix
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Validation — transform and whitelist but do NOT forbidNonWhitelisted to avoid 400 on extra fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`✅ DriftIQ Backend running on: http://localhost:${port}/api`);
}
bootstrap();
