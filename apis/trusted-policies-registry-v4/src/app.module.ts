import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
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
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}

export default AppModule;
