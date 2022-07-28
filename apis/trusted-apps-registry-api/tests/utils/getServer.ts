import { HttpServer, INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfig } from "../../src/config/configuration";

export const getServer = (
  app: INestApplication,
  configService: ConfigService<ApiConfig>
) => {
  if (process.env.TEST_ENV === "remote") {
    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    return `${domain}${apiUrlPrefix}`;
  }

  return app.getHttpServer() as HttpServer;
};

export default getServer;
