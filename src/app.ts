import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import * as winston from "winston";
import { utilities as winstonUtilities, WinstonModule } from "nest-winston";
import helmet from "helmet";
import { AppModule } from "./app.module";

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

  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle("Application Registry API")
    .setDescription("The interface for the APP Registry BESU contract.")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("trusted-apps-registry/api-docs", app, document);

  app.enableCors();
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(configService.get("APP_PORT"));
}

export default bootstrap;
