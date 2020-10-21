import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import { fastifyHelmet } from "fastify-helmet";
import AppModule from "./app.module";
import AllExceptionsFilter from "./filters/http-exception.filter";
import { createLogger, consoleTransport } from "./logger/logger";
import { ConfigObject } from "./config/configuration";

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();
  fastifyAdapter.enableCors({ methods: "*" });

  const logger = createLogger();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger }
  );

  const configService = app.get<ConfigService<ConfigObject>>(ConfigService);
  const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
  const port = configService.get<number>("apiPort");
  const logLevel = configService.get<string>("logLevel");

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

  // app.register(fastifyHelmet) currently produces TS Errors
  // Argument of type 'FastifyPluginCallback<Readonly<HelmetOptions>, Server>' is not assignable to parameter of type 'FastifyPlugin<Readonly<HelmetOptions>>'.
  // NestJS doesn't seem to support FastifyPluginCallback yet
  // That's why we use this workaround
  await (app.getHttpAdapter().getInstance() as FastifyInstance).register(
    fastifyHelmet
  );

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
