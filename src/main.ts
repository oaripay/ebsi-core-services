import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import fastifyHelmet from "@fastify/helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { createLogger, consoleTransport } from "./logger/logger";
import { ApiConfig } from "./config/configuration";
import { setupInterceptors } from "./axiosInterceptors";

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();
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
  const domain = configService.get<string>("domain");
  const localOrigin = configService.get<string>("localOrigin");

  // Set logger level
  if (logLevel === "silent") {
    consoleTransport.silent = true;
  } else {
    consoleTransport.level = logLevel;
  }

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiUrlPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.register(fastifyHelmet);

  app.use(
    (
      req: { method: string; url: string },
      res: unknown,
      next: () => NestMiddleware
    ) => {
      logger.log(`${req.method} ${req.url}`, "main");
      next();
    }
  );
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Setup axios interceptors
  setupInterceptors(domain, localOrigin, logger);

  logger.log(
    `API start, NODE_ENV: ${process.env.NODE_ENV} port:${port}`,
    "main"
  );
  logger.debug(`Log level: ${logLevel}`, "main");

  // Notes:
  // - see https://github.com/nestjs/nest/issues/3209
  // - read Note https://www.fastify.io/docs/latest/Getting-Started/#your-first-server
  await app.listen(port, "0.0.0.0", (err: Error, address: string) => {
    if (err) {
      logger.error(err.message, undefined, "main");
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
