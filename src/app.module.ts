import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import AppController from "./app.controller";
import AdministratorsModule from "./modules/administrators/administrators.module";
import IssuersModule from "./modules/issuers/issuers.module";
import JsonRpcModule from "./modules/jsonrpc/jsonrpc.module";

@Module({
  imports: [
    ApiConfigModule,
    AdministratorsModule,
    IssuersModule,
    JsonRpcModule,
  ],
  controllers: [AppController],
  providers: [Logger],
})
export default class AppModule {}
