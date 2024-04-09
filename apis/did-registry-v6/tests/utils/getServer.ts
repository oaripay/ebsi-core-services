import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../src/config/configuration.js";

export const getServer = (
  app: NestFastifyApplication,
  configService: ConfigService<ApiConfig, true>,
) => {
  if (process.env.TEST_ENV === "remote") {
    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    return `${domain}${apiUrlPrefix}`;
  }

  return app.getHttpServer();
};

export default getServer;
