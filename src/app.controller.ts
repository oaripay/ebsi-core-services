import { Controller, Get, Param, Query, Logger } from "@nestjs/common";
import {
  NotFoundError,
  BadRequestError,
} from "@cef-ebsi/problem-details-errors";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import AppService from "./services/app.service";
import DIDParams from "./types/DIDParams";
import AppFormatter from "./util/app.formatter";
import TrustedIssuer from "./types/TrustedIssuer";

const HTTP_401 = "The client is not allowed to access resource";
const HTTP_404 = "Resource not found!";
const HTTP_200 = "Fetch Resource.";

@Controller("/trusted-issuers-registry")
export default class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private appService: AppService,
    private appFormatter: AppFormatter
  ) {}

  @ApiOperation({
    summary: "health endpoint",
    description: `will return ok if api is up`,
  })
  @Get("/v1/health")
  health() {
    this.logger.debug("GET health/  ");
    return "ok";
  }

  @ApiOperation({
    description:
      "Get all universities defined as trusted issuers in BESU blockchain",
  })
  @ApiResponse({ status: 200, description: HTTP_200 })
  @ApiResponse({ status: 401, description: HTTP_401 })
  @Get("/v1/issuers")
  async issuers(@Query() query) {
    const size = parseInt(query.page ? query.page.size ?? 10 : 10, 10);
    const after = parseInt(query.page ? query.page.after ?? 0 : 0, 10);

    const univ = await this.appService.getUniversities();
    const gov = await this.appService.getGovernments();

    let result = {};
    let counter = 0;
    let maxCounter = 0;
    const items = [];
    const itemStartingFrom = after * size;
    univ.forEach((val, id) => {
      counter += 1;
      if (itemStartingFrom <= counter && maxCounter < size) {
        maxCounter += 1;
        items.push({
          name: univ[id].preferredName,
          did: univ[id].issuerDID,
        });
      }
    });

    gov.forEach((val, id) => {
      counter += 1;
      if (itemStartingFrom < counter && maxCounter < size) {
        maxCounter += 1;
        items.push({
          name: gov[id].name,
          did: gov[id].issuerDID,
        });
      }
    });

    const pages = Math.ceil((counter + 1) / size);
    if (pages - 1 < after) {
      throw new BadRequestError("Invalid page number", {
        detail: `Page number ${pages - 1} must be less than after ${after}`,
      });
    }
    result = {
      items,
      total: counter,
      pageSize: size,
      links: {
        first: `/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=${size}`,
        prev: `/trusted-issuers-registry/v1/issuers?page[after]=${Math.max(
          0,
          after - 1
        )}&page[size]=${size}`,
        next: `/trusted-issuers-registry/v1/issuers?page[after]=${
          after - -1
        }&page[size]=${size}`,
        last: `/trusted-issuers-registry/v1/issuers?page[after]=${
          pages - 1
        }&page[size]=${size}`,
      },
    };
    return result;
  }

  @ApiOperation({ description: "Get trusted issuer by did" })
  @ApiResponse({ status: 200, description: "University JSON" })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @ApiResponse({ status: 401, description: HTTP_401 })
  @Get("/v1/issuers/:did")
  async issuer(@Param() params: DIDParams): Promise<TrustedIssuer> {
    this.logger.debug(`/v1/issuers/:${JSON.stringify(params)}`);
    const result: TrustedIssuer = {
      issuerDID: params.did,
      entities: [],
    };

    if (await this.appService.doesUniversityExists(params.did)) {
      const univTypeIssuer = await this.appService.getUniversity(params.did);
      const documents = await this.appService.getDocumentsByUniversity(
        params.did
      );
      const accs = await this.appService.getAccreditationsUniversity(
        params.did
      );

      await Promise.all(
        documents.map(async (doc, id) => {
          try {
            const downloadedDoc = await this.appService.downloadDocument(
              doc.vcCode
            );

            if (!downloadedDoc) {
              documents[id].body = null;
              return;
            }

            if (downloadedDoc.status === 200)
              documents[id].body = downloadedDoc.data;
            else if (downloadedDoc.status === 404) documents[id].body = "";
            else documents[id].body = null;
          } catch (error) {
            // do nothing, can't extract from besu
            this.logger.warn(
              `Error at index ${id} hash ${documents[id].vcCode}. Cannot extract from besu, message: ${error.message}`
            );
          }
        })
      );

      result.entities.push({
        type: "university",
        moderator: univTypeIssuer.moderator,
        documents: documents.map(AppFormatter.formatDocument),
        status: univTypeIssuer.status,
        preferredName: univTypeIssuer.preferredName,
        alternativeName: univTypeIssuer.alternativeName,
        homepage: univTypeIssuer.homepage,
        escoOrganizationType: univTypeIssuer.escoOrganizationType,
        siteLocation: univTypeIssuer.siteLocation,
        accreditations: accs.map(AppFormatter.formatAccreditation),
      });
    }

    if (await this.appService.doesGovernmentExists(params.did)) {
      const govTypeIssuer = await this.appService.getGovernment(params.did);
      const documents = await this.appService.getDocumentsByGovernment(
        params.did
      );
      result.entities.push({
        type: "government",
        moderator: govTypeIssuer.moderator,
        documents: documents.map((document) =>
          AppFormatter.formatDocument(document)
        ),
        status: govTypeIssuer.status,
        name: govTypeIssuer.name,
        country: govTypeIssuer.country,
      });
    }

    if (!result.entities.length) {
      throw new NotFoundError("Issuer not found", {
        detail: `The format of ${params.did} parameter is not valid or entity not found`,
      });
    }
    return result;
  }
}
