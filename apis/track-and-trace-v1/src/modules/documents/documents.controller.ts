import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Accepts, PaginatedList } from "@ebsiint-api/shared";
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
  @Accepts("application/json")
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
  @Accepts("application/json")
  async getDocument(@Param() params: GetDocumentParamsDto): Promise<Document> {
    const { documentId } = params;

    const document = await this.documentsService.getDocument(documentId);

    return document;
  }

  @Get("/:documentId/events")
  @Accepts("application/json")
  async getDocumentEvents(
    @Param() params: GetDocumentEventsParamsDto,
    @Query() query: GetDocumentEventsDto,
  ): Promise<PaginatedList<DocumentEventsLink>> {
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
  @Accepts("application/json")
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
  @Accepts("application/json")
  async getDocumentAccesses(
    @Param() params: GetDocumentAccessesParamsDto,
    @Query() query: GetDocumentAccessesDto,
  ): Promise<PaginatedList<Access>> {
    const { documentId } = params;

    const accesses =
      await this.documentsService.getDocumentAccesses(documentId);

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
