import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import * as winston from "winston";
import { utilities as winstonUtilities, WinstonModule } from "nest-winston";
import helmet from "helmet";
import { AppModule } from "./app.module";
import HttpExceptionFilter from "./filters/http-exception.filter";

export async function bootstrap() {
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winstonUtilities.format.nestLike()
        ),
      }),
    ],
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });
  const configService = app.get(ConfigService);

  // Dynamically update the logger level based on conf (only for Console transport)
  // @ts-ignore
  logger.logger.transports[0].level = configService.get("logLevel");

  // Display server info on bootstrap
  logger.debug(`Log level: ${configService.get("logLevel")}`, "ServerInfo");
  logger.debug(`Port: ${configService.get("apiPort")}`, "ServerInfo");

  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle("Trusted Apps Registry API")
    .setDescription(
      "Trusted Apps Registry API is a Core Service of the EBSI platform providing the capability of verifying if an application is trusted and authorized to interact with other applications in the EBSI network."
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

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("trusted-apps-registry/v1/api-docs", app, document);

  app.enableCors();
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(configService.get("apiPort"));
}

export default bootstrap;
