import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter';
import { EnvConfig } from './config/env-config';

async function bootstrap() {
  console.log('CourtHub API bootstrapping');
  const app = await NestFactory.create(AppModule);
  console.log('CourtHub API application initialized');
  const config = app.get(EnvConfig);

  if (config.nodeEnv === 'production' || config.nodeEnv === 'development_ngrok') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(
    session({
      secret: config.jwtSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: config.cookieOptions.sameSite,
        secure: config.cookieOptions.secure,
        maxAge: 10 * 60 * 1000,
      },
    }),
  );
  app.enableCors({ origin: config.frontendUrls, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

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
