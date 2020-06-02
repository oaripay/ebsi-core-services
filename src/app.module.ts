import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import AppController from "./app.controller";
import AppService from "./services/app.service";
import EthersService from "./services/ethers.service";
import AppFormatter from "./util/app.formatter";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", ".env.dev"]
    }),
    WinstonModule.forRoot({
      transports: [
        // other transports...
      ],
      // other options
      level: process.env.LOG_LEVEL
    })
  ],
  controllers: [AppController],
  providers: [AppFormatter, EthersService, AppService]
})
export default class AppModule {}
