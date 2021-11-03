import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HealthModule } from "./modules/health/health.module";
import { ApiConfigModule, ApiConfig } from "./config/configuration";
import { EbsiThrottler } from "./guards";

@Module({
  imports: [
    ApiConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [ApiConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiConfig>) => ({
        ttl: config.get("throttleTtl"),
        limit: config.get("throttleLimit"),
      }),
    }),
    NotificationsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: EbsiThrottler,
    },
  ],
})
export class AppModule {}

export default AppModule;
