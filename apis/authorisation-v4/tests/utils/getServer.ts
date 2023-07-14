import type { HttpServer, INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../src/config/configuration";

export const getServer = (
  app: INestApplication,
  configService: ConfigService<ApiConfig, true>
) => {
  const testEnv = configService.get<string>("testEnv");

  if (testEnv === "remote") {
    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    return `${domain}${apiUrlPrefix}`;
  }

  return app.getHttpServer() as HttpServer;
};

export default getServer;
