import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ResponseInterceptor } from '../libs/shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../libs/shared/filters/http-exception.filter';

function formatValidationErrors(errors: ValidationError[]) {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints?.whitelistValidation) {
      messages.push(`Trường ${error.property} không được phép gửi`);
      continue;
    }

    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }

    if (error.children?.length) {
      messages.push(...formatValidationErrors(error.children));
    }
  }

  return messages;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5555',
      'http://127.0.0.1:5555',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException(formatValidationErrors(errors)),
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('VNA Backend API')
    .setDescription(
      [
        'Tai lieu API cho he thong VNA.',
        'Tat ca response thanh cong duoc boc trong format: success, statusCode, message, data, timestamp, path.',
        'Cac API quan tri can dang nhap bang tai khoan ADMIN va truyen Bearer token.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhap accessToken nhan duoc tu API dang nhap.',
      },
      'access-token',
    )
    .addTag('Auth', 'Dang nhap, quen mat khau, doi mat khau, doi Gmail')
    .addTag('Users', 'Quan ly nguoi dung cho ADMIN')
    .addTag('Businesses', 'Quan ly doanh nghiep cho ADMIN')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'VNA Backend API Docs',
  });

  await app.listen(process.env.APP_PORT ?? 3000);
}

bootstrap();
