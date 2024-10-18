import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyAccepts } from "@fastify/accepts";
import {
  setupInterceptors,
  frameworkErrors,
  methodNotAllowed,
} from "@ebsiint-api/shared";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import { createLogger, consoleTransport } from "./logger/logger.js";
import type { ApiConfig } from "./config/configuration.js";

async function bootstrap(): Promise<void> {
  const logger = createLogger();
  const fastifyAdapter = new FastifyAdapter({
    frameworkErrors: frameworkErrors(logger),
  });
  fastifyAdapter.enableCors({ methods: "*" });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger },
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
      "main",
    );
  }

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiUrlPrefix);

  // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        "frame-ancestors": ["'none'"],
      },
    },
    xFrameOptions: {
      action: "deny",
    },
  });

  // Parse "Accept" request header
  await app.register(fastifyAccepts);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook("onRequest", methodNotAllowed);

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
