import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

export async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle("Application Registry API")
    .setDescription("The interface for the APP Registry BESU contract.")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("trusted-apps-registry/api-docs", app, document);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(configService.get("APP_PORT"));
}

export default bootstrap;
