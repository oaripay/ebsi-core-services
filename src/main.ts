import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, NestApplicationOptions } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule
} from "nest-winston";
import winston from "winston";

import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import helmet from "helmet";
import AppModule from "./app.module";

Logger.log(
  `API start, URL: ${process.env.PUBLIC_URL} NODE_ENV: ${process.env.NODE_ENV} port:${process.env.APP_PORT}`,
  "main"
);
Logger.debug(`Log level: ${process.env.LOG_LEVEL}`, "main");

async function bootstrap() {
  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle("Trusted Issuers Registry API")
    .setDescription(
      "Trusted Issuers Registry API is a Core Service of the EBSI platform providing the capability of verifying if an issuer is trusted and authorized to interact with other applications in the EBSI network."
    )
    .setVersion("1.0.0")
    .setTermsOfService("/docs/terms")
    .setLicense("EUPL-1.2", "https://joinup.ec.europa.eu/page/eupl-text-11-12")
    .setContact(
      "EBSI Support",
      "https://ec.europa.eu/cefdigital/wiki/display/CEFDIGITAL/ebsi",
      "CEF-BUILDING-BLOCKS@ec.europa.eu"
    )
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
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.APP_PORT || 3000);
}
bootstrap();
