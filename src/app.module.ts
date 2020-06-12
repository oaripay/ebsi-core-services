import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import * as Joi from "@hapi/joi";
import AppController from "./app.controller";
import AppService from "./services/app.service";
import EthersService from "./services/ethers.service";
import AppFormatter from "./util/app.formatter";
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
        API_PRIVATE_KEY: Joi.string().required(),
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
      }),
    }),
    WinstonModule.forRoot({
      transports: [
        // other transports...
      ],
      // other options
      level: process.env.LOG_LEVEL,
    }),
  ],
  controllers: [AppController],
  providers: [AppFormatter, EthersService, AppService],
})
export default class AppModule {}
