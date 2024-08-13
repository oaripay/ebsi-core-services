import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import DocumentsService from "./documents.service.js";
import {
  formatDocumentAccesses,
  formatDocumentEvents,
  formatDocuments,
} from "./documents.formatter.js";
import type {
  Access,
  Document,
  DocumentEventsLink,
  DocumentsLink,
  Event,
} from "./documents.interface.js";
import {
  GetDocumentAccessesDto,
  GetDocumentAccessesParamsDto,
  GetDocumentEventParamsDto,
  GetDocumentEventsDto,
  GetDocumentEventsParamsDto,
  GetDocumentParamsDto,
  GetDocumentsDto,
} from "./dto/index.js";
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
  ): Promise<PaginatedListWithoutTotal<DocumentsLink>> {
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
  async getDocument(@Param() params: GetDocumentParamsDto): Promise<Document> {
    const { documentId } = params;

    const document = await this.documentsService.getDocument(documentId);

    return document;
  }

  @Get("/:documentId/events")
  async getDocumentEvents(
    @Param() params: GetDocumentEventsParamsDto,
    @Query() query: GetDocumentEventsDto,
  ): Promise<PaginatedListWithoutTotal<DocumentEventsLink>> {
    const { documentId } = params;

    const events = await this.documentsService.getDocumentEvents(
      documentId,
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/documents/${documentId}/events`;

    return formatDocumentEvents(
      events,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:documentId/events/:eventId")
  async getDocumentEvent(
    @Param() params: GetDocumentEventParamsDto,
  ): Promise<Event> {
    const { documentId, eventId } = params;

    const event = await this.documentsService.getDocumentEvent(
      documentId,
      eventId,
    );

    return event;
  }

  @Get("/:documentId/accesses")
  async getDocumentAccesses(
    @Param() params: GetDocumentAccessesParamsDto,
    @Query() query: GetDocumentAccessesDto,
  ): Promise<PaginatedListWithoutTotal<Access>> {
    const { documentId } = params;

    const accesses = await this.documentsService.getDocumentAccesses(
      documentId,
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/documents/${documentId}/accesses`;

    return formatDocumentAccesses(
      accesses,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }
}
