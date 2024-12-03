import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import DocumentsController from "./documents.controller.js";
import DocumentsService from "./documents.service.js";

@Module({
  controllers: [DocumentsController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, DocumentsService],
})
export class DocumentsModule {}

export default DocumentsModule;
