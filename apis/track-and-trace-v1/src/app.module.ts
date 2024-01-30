import { Module, Logger } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ApiConfigModule } from "./config/configuration.js";
import { HealthModule } from "./modules/health/health.module.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { VersionInterceptor } from "./interceptors/version.interceptor.js";
import { OpenApiModule } from "./modules/openapi/openapi.module.js";
import { LedgerModule } from "./modules/ledger/ledger.module.js";
import { DocumentsModule } from "./modules/documents/documents.module.js";
import { AccessesModule } from "./modules/accesses/accesses.module.js";
import { JsonRpcModule } from "./modules/jsonrpc/jsonrpc.module.js";
import { AppService } from "./app.service.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    ApiConfigModule,
    HealthModule,
    OpenApiModule,
    LedgerModule,
    DocumentsModule,
    AccessesModule,
    JsonRpcModule,
  ],
  controllers: [AppController],
  providers: [
    Logger,
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
