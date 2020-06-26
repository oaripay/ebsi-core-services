import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "@hapi/joi";
import { AppController } from "./app.controller";
import { AppService } from "./services/app.service";
import { EthersService } from "./services/ethers.service";
import configuration from "./config/configuration";
import HttpExceptionFilter from "./filters/http-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema: Joi.object({
        EBSI_ENV: Joi.string()
          .valid("local", "integration", "development", "production")
          .required(),
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .default("development"),
        API_PRIVATE_KEY: Joi.string().required(),
        API_PORT: Joi.number().default(9000),
        LOG_LEVEL: Joi.string()
          .valid("error", "warn", "info", "http", "verbose", "debug", "silly")
          .allow("")
          .optional(),
        WEB3_PROVIDER: Joi.string().allow("").optional(),
        CONTRACT_ADDR: Joi.string().required(),
        AUTH_EXPIRE_TIME: Joi.number().allow("").optional(),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    EthersService,
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}

export default AppModule;
