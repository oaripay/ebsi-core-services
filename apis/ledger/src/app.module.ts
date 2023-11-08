import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { BesuModule } from "./modules/besu/besu.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [ApiConfigModule, HealthModule, BesuModule, OpenApiModule],
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
  ],
})
export class AppModule {}

export default AppModule;
