import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import DocumentsController from "./documents.controller.js";
import DocumentsService from "./documents.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [DocumentsController],
  providers: [Logger, DocumentsService],
})
export class DocumentsModule {}

export default DocumentsModule;
