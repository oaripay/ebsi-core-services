import {
  Controller,
  Get,
  BadRequestException,
  Param,
  NotFoundException,
  Query,
  Logger,
} from "@nestjs/common";
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
    try {
      const size = parseInt(query.page ? query.page.size ?? 10 : 10, 10);
      const after = parseInt(query.page ? query.page.after ?? 0 : 0, 10);

      const univ = (
        await this.appService.getUniversityTrustedIssuers()
      ).map((tiUniv) => AppFormatter.formatUnivIssuer(tiUniv));

      const gov = (await this.appService.getGovTrustedIssuers()).map((tiGov) =>
        AppFormatter.formatGovIssuer(tiGov)
      );

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
        throw new BadRequestException("invalid page number");
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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException("error");
    }
  }

  @ApiOperation({ description: "Get trusted issuer by did" })
  @ApiResponse({ status: 200, description: "University JSON" })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @ApiResponse({ status: 401, description: HTTP_401 })
  @Get("/v1/issuers/:did")
  async issuer(@Param() params: DIDParams): Promise<Array<TrustedIssuer>> {
    try {
      this.logger.debug(`/v1/issuers/:${JSON.stringify(params)}`);
      let univTypeIssuer;
      let govTypeIssuer;
      const result: Array<TrustedIssuer> = [];
      let documents = [];
      if (await this.appService.doesIssuerExists(params.did)) {
        univTypeIssuer = await this.appService.getIssuer(params.did);
        documents = await this.appService.getDocuments(params.did);
        const accs = await this.appService.getAccreditations(params.did);
        const dlDocs = documents.map((doc, id) => {
          const f = async () => {
            try {
              const downloadedDoc = await this.appService.downloadDocument(
                doc.vcCode
              );

              let dlStatus = null;
              if (downloadedDoc) {
                dlStatus =
                  downloadedDoc.status === 200 ? downloadedDoc.data : null;
              }
              documents[id].body = downloadedDoc ? dlStatus : "";
            } catch (error) {
              // do nothing, can't extract from besu
              this.logger.warn(
                `Error at index ${id} hash ${documents[id].vcCode}. Cannot extract from besu, message: ${error.message}`
              );
            }
          };
          return f();
        });
        await Promise.all(dlDocs);

        result.push({
          moderator: univTypeIssuer.moderator,
          issuerDID: univTypeIssuer.issuerDID,
          preferredName: univTypeIssuer.preferredName,
          alternativeName: univTypeIssuer.alternativeName,
          homepage: univTypeIssuer.homepage,
          escoOrganizationType: univTypeIssuer.escoOrganizationType,
          siteLocation: univTypeIssuer.siteLocation,
          status: univTypeIssuer.status,
          documents: documents.map((doc) => AppFormatter.formatDocument(doc)),
          accreditations: accs.map((acc) =>
            AppFormatter.formatAccreditation(acc)
          ),
        });
      }
      if (await this.appService.doesIssuerForGovExists(params.did)) {
        govTypeIssuer = await this.appService.getIssuerForGov(params.did);
        documents = await this.appService.getDocumentsForGov(params.did);
        result.push({
          moderator: govTypeIssuer.moderator,
          issuerDID: govTypeIssuer.issuerDID,
          name: govTypeIssuer.name,
          country: govTypeIssuer.country,
          status: govTypeIssuer.status,
          documents: documents.map((document) =>
            AppFormatter.formatDocument(document)
          ),
        });
      }
      if (!result.length) {
        throw new NotFoundException(
          `The format of ${params.did} parameter is not valid or entity not found`
        );
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "there was a problem processing your request"
      );
    }
  }
}
