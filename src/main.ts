import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { fastifyHelmet } from "fastify-helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { createLogger, consoleTransport } from "./logger/logger";
import { ApiConfig } from "./config/configuration";
import { EbsiValidationPipe } from "./pipes/ebsi-validation.pipe";
import { setupInterceptors } from "./axiosInterceptors";

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

  logger.debug(
    `Starting API with:
- NODE_ENV: ${process.env.NODE_ENV}
- API_URL_PREFIX: ${apiUrlPrefix}
- DOMAIN: ${domain}
- API_PORT: ${port}
- LOG_LEVEL: ${logLevel}
`,
    "main"
  );

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  app.setGlobalPrefix(apiUrlPrefix);

  // app.register(fastifyHelmet) currently produces TS Errors
  // Argument of type 'FastifyPluginCallback<Readonly<HelmetOptions>, Server>' is not assignable to parameter of type 'FastifyPlugin<Readonly<HelmetOptions>>'.
  // NestJS doesn't seem to support FastifyPluginCallback yet
  // That's why we use this workaround
  await (app.getHttpAdapter().getInstance() as FastifyInstance).register(
    fastifyHelmet
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new EbsiValidationPipe());

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
