import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { LoggingInterceptor } from "@ebsiint-api/shared";
import { ApiConfigModule, type ApiConfig } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { PoliciesModule } from "./modules/policies/policies.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppService } from "./app.service.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    PoliciesModule,
    UsersModule,
    OpenApiModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService<ApiConfig, true>) =>
        new LoggingInterceptor(configService.get("logLevel")),
      inject: [ConfigService],
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
