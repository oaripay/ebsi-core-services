import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { fastifyHelmet } from "fastify-helmet";
import AppModule from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { createLogger, consoleTransport } from "./logger/logger";
import { ConfigObject } from "./config/configuration";

declare const module: {
  hot: {
    accept: () => void;
    dispose: (cb: () => Promise<void>) => void;
  };
};

async function bootstrap(): Promise<void> {
  const fastifyAdapter = new FastifyAdapter();
  fastifyAdapter.enableCors({ methods: "*" });

  const logger = createLogger();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger }
  );

  const configService = app.get<ConfigService<ConfigObject>>(ConfigService);
  const apiUrl = configService.get<string>("apiUrl");
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
- EBSI_ENV: ${process.env.EBSI_ENV}
- NODE_ENV: ${process.env.NODE_ENV}
- API_URL:${apiUrl}
- besuRPCNode:${configService.get<string>("besuRPCNode")}
- API_PORT:${port}
- LOG_LEVEL: ${logLevel}
`,
    "main"
  );

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiUrl);
  app.register(fastifyHelmet);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe());

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

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(async () => {
      await app.close();
    });
  }
}

bootstrap()
  .then(() => {})
  .catch((e) => {
    throw e;
  });
