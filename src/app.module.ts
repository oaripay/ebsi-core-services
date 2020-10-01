import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "./config/configuration";
import AppController from "./app.controller";
import IssuersModule from "./modules/issuers/issuers.module";
import JsonRpcModule from "./modules/jsonrpc/jsonrpc.module";

@Module({
  imports: [ApiConfigModule, IssuersModule, JsonRpcModule],
  controllers: [AppController],
  providers: [Logger],
})
export default class AppModule {}
