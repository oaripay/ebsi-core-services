import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedList } from "@ebsiint-api/shared";
import DocumentsService from "./documents.service.js";
import { formatDocuments } from "./documents.formatter.js";
import type { Document, DocumentsLink } from "./documents.interface.js";
import { GetDocumentParamsDto, GetDocumentsDto } from "./dto/index.js";
import type { ApiConfig } from "../../config/configuration.js";

@Controller("/documents")
export default class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getDocuments(
    @Query() query: GetDocumentsDto,
  ): Promise<PaginatedList<DocumentsLink>> {
    const documents = await this.documentsService.getDocuments(
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/documents`;

    return formatDocuments(
      documents,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:documentId")
  async getDidDocument(
    @Param() params: GetDocumentParamsDto,
  ): Promise<Document> {
    const { documentId } = params;

    const document = await this.documentsService.getDocument(documentId);

    return document;
  }
}
