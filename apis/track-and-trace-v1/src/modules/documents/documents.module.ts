import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import DocumentsController from "./documents.controller.js";
import DocumentsService from "./documents.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [DocumentsController],
  providers: [Logger, DocumentsService, LedgerService],
})
export class DocumentsModule {}

export default DocumentsModule;
