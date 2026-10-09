import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvConfig } from './config/env-config';

async function bootstrap() {
  console.log('CourtHub API bootstrapping');
  const app = await NestFactory.create(AppModule);
  console.log('CourtHub API application initialized');
  const config = app.get(EnvConfig);

  app.use(cookieParser());
  app.enableCors({ origin: config.frontendUrls, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CourtHub API')
    .setDescription('Sports court booking API')
    .setVersion('0.1')
    .addCookieAuth('access_token')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.port);
  console.log(`CourtHub API listening on port ${config.port}`);
}

void bootstrap().catch((error: unknown) => {
  console.error('CourtHub API failed to start', error);
  process.exitCode = 1;
});
