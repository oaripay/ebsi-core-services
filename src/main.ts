import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger, NestMiddleware } from "@nestjs/common";
import { fastifyHelmet } from "fastify-helmet";
import AppModule from "./app.module";
import AllExceptionsFilter from "./filters/http-exception.filter";

Logger.log(
  `API start, NODE_ENV: ${process.env.NODE_ENV} port:${process.env.APP_PORT}`,
  "main"
);
Logger.debug(`Log level: ${process.env.LOG_LEVEL}`, "main");

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();
  fastifyAdapter.enableCors({ methods: "*" });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.register(fastifyHelmet);
  app.use(
    (req: { method: string; url: string }, res, next: () => NestMiddleware) => {
      Logger.log(`${req.method} ${req.url}`, "main");
      next();
    }
  );
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(Number(process.env.APP_PORT) || 3000, "0.0.0.0");
}
bootstrap()
  .then(() => {})
  .catch(() => {});
