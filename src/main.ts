import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { fastifyHelmet } from "fastify-helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { createLogger, consoleTransport } from "./logger/logger";
import { ApiConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const fastifyAdapter = new FastifyAdapter({
    // By default, maxParamLength=100 but we allow keys to be up to 256 bytes, thus we need to allow more chars
    // https://www.fastify.io/docs/latest/Server/#maxparamlength
    maxParamLength: 400,
    // By default, bodyLimit=1048576 (1MiB)
    // https://www.fastify.io/docs/latest/Server/#bodylimit
    // We increase the limit to 5MiB
    bodyLimit: 5 * 1024 * 1024,
  });
  fastifyAdapter.enableCors({ methods: "*" });

  const logger = createLogger();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger }
  );

  const configService = app.get<ConfigService<ApiConfig>>(ConfigService);
  const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
  const port = configService.get<number>("apiPort");
  const logLevel = configService.get<string>("logLevel");

  // Set logger level
  if (logLevel === "silent") {
    consoleTransport.silent = true;
  } else {
    consoleTransport.level = logLevel;
  }

  logger.debug(
    `Starting API with:
- NODE_ENV: ${process.env.NODE_ENV}
- API_URL_PREFIX:${apiUrlPrefix}
- API_PORT:${port}
- LOG_LEVEL: ${logLevel}
`,
    "main"
  );

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiUrlPrefix);

  await app.register(fastifyHelmet);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Notes:
  // - see https://github.com/nestjs/nest/issues/3209
  // - read Note https://www.fastify.io/docs/latest/Getting-Started/#your-first-server
  await app.listen(port, "0.0.0.0", (err: Error, address: string) => {
    if (err) {
      logger.error(err.message, null, "main");
    } else {
      logger.log(`Server listening on ${address}`, "main");
    }
  });
}

bootstrap()
  .then(() => {})
  .catch((e) => {
    throw e;
  });
