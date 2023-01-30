import { ConfigService } from "@nestjs/config";
import { TestingModule } from "@nestjs/testing";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import FastifyFormBody from "@fastify/formbody";
import FastifyHelmet from "@fastify/helmet";
import qs from "qs";
import { ApiConfig } from "../../src/config/configuration";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

/**
 * Configure Nest Fastify app with all the parsers, filters, and validation pipes.
 * /!\ Must be aligned with src/main.ts.
 */
export async function configureApp(
  moduleFixture: TestingModule,
  configService: ConfigService<ApiConfig, true>
) {
  const fastifyAdapter = new FastifyAdapter();
  fastifyAdapter.enableCors({ methods: "*" });

  // Register "application/x-www-form-urlencoded" parser
  await fastifyAdapter.register(FastifyFormBody, {
    parser: (str: string) =>
      qs.parse(str, {
        // Parse up to 50 children deep
        depth: 50,
        // Parse up to 1000 parameters
        parameterLimit: 1000,
      }),
  });

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    fastifyAdapter,
    { bodyParser: false }
  );

  app.enableShutdownHooks();

  await app.register(FastifyHelmet);

  app.useGlobalFilters(new AllExceptionsFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, stopAtFirstError: true })
  );

  return app;
}

export default configureApp;
