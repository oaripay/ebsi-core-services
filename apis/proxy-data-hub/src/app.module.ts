import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "./config/configuration.js";
import { AttributesModule } from "./modules/attributes/attributes.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [ApiConfigModule, AttributesModule, HealthModule, OpenApiModule],
  controllers: [AppController],
  providers: [
    ConfigService,
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
