import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "@hapi/joi";
import { AppController } from "./app.controller";
import { AppService } from "./services/app.service";
import { EthersService } from "./services/ethers.service";
import configuration from "./config/configuration";

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
        WALLET_PRIV_KEY: Joi.string().required(),
        APP_PORT: Joi.number().default(9000),
        LOG_LEVEL: Joi.string().valid(
          "error",
          "warn",
          "info",
          "http",
          "verbose",
          "debug",
          "silly"
        ),
        WEB3_PROVIDER: Joi.string(),
        CONTRACT_ADDR: Joi.string(),
        AUTH_EXPIRE_TIME: Joi.number(),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [EthersService, AppService],
})
export class AppModule {}

export default AppModule;
