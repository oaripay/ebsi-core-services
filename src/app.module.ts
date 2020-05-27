import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "@hapi/joi";
import { AppController } from "./app.controller";
import { AppService } from "./shared/services/app.service";
import { EthersService } from "./shared/services/ethers.service";
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
      }),
    }),
  ],
  controllers: [AppController],
  providers: [EthersService, AppService],
})
export class AppModule {}

export default AppModule;
