import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { VersionInterceptor } from "./interceptors/version.interceptor";
import { HealthModule } from "./modules/health/health.module";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { UsersModule } from "./modules/users/users.module";
import { OpenApiModule } from "./modules/openapi/openapi.module";
import { AppService } from "./app.service";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    JsonRpcModule,
    PoliciesModule,
    UsersModule,
    OpenApiModule,
  ],
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
