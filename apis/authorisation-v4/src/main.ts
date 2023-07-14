import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyFormbody } from "@fastify/formbody";
import { setupInterceptors } from "@ebsiint-api/shared";
import qs from "qs";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { createLogger, consoleTransport } from "./logger/logger";
import { ApiConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const fastifyAdapter = new FastifyAdapter();
  fastifyAdapter.enableCors({ methods: "*" });

  // Register "application/x-www-form-urlencoded" parser
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  await fastifyAdapter.register(fastifyFormbody, {
    parser: (str: string) =>
      qs.parse(str, {
        // Parse up to 50 children deep
        depth: 50,
        // Parse up to 1000 parameters
        parameterLimit: 1000,
      }),
  });

  const logger = createLogger();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger, bodyParser: false }
  );

  const configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
  const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
  const port = configService.get<number>("apiPort");
  const logLevel = configService.get<string>("logLevel");
  const domain = configService.get<string>("domain");
  const localOrigin = configService.get<string>("localOrigin");
  const dockerContainerTag = configService.get<string>("dockerContainerTag");

  // Set logger level
  if (logLevel === "silent") {
    consoleTransport.silent = true;
  } else {
    consoleTransport.level = logLevel;
  }

  if (logger.debug) {
    logger.debug(
      `Starting API with:
- NODE_ENV: ${process.env.NODE_ENV}
- API_URL_PREFIX:${apiUrlPrefix}
- API_PORT:${port}
- LOG_LEVEL: ${logLevel}
- Docker container tag: ${dockerContainerTag}
`,
      "main"
    );
  }

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiUrlPrefix);

  await app.register(fastifyHelmet);

  app.useGlobalFilters(new AllExceptionsFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, stopAtFirstError: true })
  );

  // Setup axios interceptors
  setupInterceptors(domain, localOrigin);

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
