import { LoggingInterceptor } from "@ebsiint-api/shared";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";

import type { ApiConfig } from "./config/configuration.ts";

import { AppController } from "./app.controller.ts";
import { AppService } from "./app.service.ts";
import { ApiConfigModule } from "./config/configuration.ts";
import { AuthModule } from "./modules/auth/auth.module.ts";
import { HealthModule } from "./modules/health/health.module.ts";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.ts";
import { LedgerModule } from "./modules/ledger/ledger.module.ts";

@Module({
  controllers: [AppController],
  imports: [
    ApiConfigModule,
    AuthModule,
    LedgerModule,
    HealthModule,
    JsonRpcModule,
  ],
  providers: [
    {
      inject: [ConfigService],
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel")),
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
