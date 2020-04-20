import { NestFactory } from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import config from './config';
import {AppModule} from './app.module';

async function bootstrap() {

  const options = new DocumentBuilder()
      .setTitle('Issuers')
      .setVersion('1.0')
      .addTag('issuers')
      .build();
  require('dotenv').config();
  const app = await NestFactory.create(AppModule);
  const document = SwaggerModule.createDocument(app, options);
  // SwaggerModule.setup('trusted-issuers/api-docs', app, document);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(config.APP_PORT || 9000);
}
bootstrap();
