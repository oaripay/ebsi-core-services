import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, NestApplicationOptions } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule
} from "nest-winston";
import * as winston from "winston";

import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

import AppModule from "./app.module";

Logger.log(
  `API start, URL: ${process.env.PUBLIC_URL} NODE_ENV: ${process.env.NODE_ENV} port:${process.env.PORT}`,
  "main"
);
Logger.debug(`Log level: ${process.env.LOG_LEVEL}`, "main");

async function bootstrap() {
  const options = new DocumentBuilder()
    .setTitle("Issuers")
    .setVersion("1.0")
    .addTag("issuers")
    .build();
  const cors: CorsOptions = {
    methods: "*"
  };
  const opt: NestApplicationOptions = {
    cors,
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike()
          )
        })
        // other transports...
      ],
      level: process.env.LOG_LEVEL
    })
  };
  const app = await NestFactory.create<NestExpressApplication>(AppModule, opt);
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("trusted-issuers-registry/api-docs", app, document);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.APP_PORT || 9000);
}
bootstrap();
