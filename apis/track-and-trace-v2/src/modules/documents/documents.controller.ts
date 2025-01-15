import {
  Accepts,
  BadRequestError,
  PaginatedListWithoutTotal,
} from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  Access,
  Document,
  DocumentEventsLink,
  DocumentsLink,
  Event,
} from "./documents.interface.js";

import {
  Document_filter,
  Event_filter,
  Invitation_filter,
} from "../../../.graphclient/index.js";
import { didToHex } from "../../shared/utils.js";
import {
  formatDocumentAccesses,
  formatDocumentEvents,
  formatDocuments,
} from "./documents.formatter.js";
import DocumentsService from "./documents.service.js";
import {
  GetDocumentAccessesDto,
  GetDocumentAccessesParamsDto,
  GetDocumentEventParamsDto,
  GetDocumentEventsDto,
  GetDocumentEventsParamsDto,
  GetDocumentParamsDto,
  GetDocumentsDto,
} from "./dto/index.js";

@Controller("/documents")
export default class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Accepts("application/json")
  @Get("/:documentId")
  async getDocument(@Param() params: GetDocumentParamsDto): Promise<Document> {
    const { documentId } = params;

    const document = await this.documentsService.getDocument(documentId);

    return document;
  }

  @Accepts("application/json")
  @Get("/:documentId/accesses")
  async getDocumentAccesses(
    @Param() params: GetDocumentAccessesParamsDto,
    @Query() query: GetDocumentAccessesDto,
  ): Promise<PaginatedListWithoutTotal<Access>> {
    const { documentId } = params;

    let grantedBy: string | undefined;
    let subject: string | undefined;

    try {
      if (query["granted-by"]) {
        grantedBy = await didToHex(query["granted-by"]);
      }
    } catch {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "granted-by must be a DID",
      });
    }

    try {
      if (query.subject) {
        subject = await didToHex(query.subject);
      }
    } catch {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "subject must be a DID",
      });
    }

    const where: Invitation_filter = {
      ...(query.permission && { type: query.permission }),
      ...(grantedBy && { grantedBy }),
      ...(subject && { subject }),
    };

    const accesses = await this.documentsService.getDocumentAccesses(
      documentId,
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/documents/${documentId}/accesses`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetDocumentAccessesDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        searchParams.append(key, query[key]!);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatDocumentAccesses(
      accesses,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
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

  @Accepts("application/json")
  @Get("/:documentId/events")
  async getDocumentEvents(
    @Param() params: GetDocumentEventsParamsDto,
    @Query() query: GetDocumentEventsDto,
  ): Promise<PaginatedListWithoutTotal<DocumentEventsLink>> {
    const { documentId } = params;

    let sender: string | undefined;

    try {
      if (query.sender) {
        sender = await didToHex(query.sender);
      }
    } catch {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "sender must be a DID",
      });
    }

    const where: Event_filter = {
      ...(query["external-hash"] && { externalHash: query["external-hash"] }),
      ...(query.origin && { origin: query.origin }),
      ...(sender && { sender }),
      ...(query.source && { source: query.source }),
    };

    const events = await this.documentsService.getDocumentEvents(
      documentId,
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/documents/${documentId}/events`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetDocumentEventsDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        searchParams.append(key, query[key]!);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatDocumentEvents(
      events,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
  @Get("")
  async getDocuments(
    @Query() query: GetDocumentsDto,
  ): Promise<PaginatedListWithoutTotal<DocumentsLink>> {
    const where: Document_filter = {
      ...(query.creator && {
        creator: query.creator,
      }),
      ...(query.source && {
        source: query.source,
      }),
    };

    const documents = await this.documentsService.getDocuments(
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/documents`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetDocumentsDto;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        searchParams.append(key, query[key]!);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatDocuments(
      documents,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }
}
