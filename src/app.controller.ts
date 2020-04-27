import {
  Controller,
  Get,
  BadRequestException,
  Param,
  NotFoundException,
  Query,
  Logger
} from "@nestjs/common";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { DIDParams } from "./validation";
import { AppFormatter } from "./app.formatter";

const HTTP_401 = "The client is not allowed to access resource";
const HTTP_404 = "Resource not found!";
const HTTP_200 = "Fetch Resource.";

@Controller("/trusted-issuers-registry")
export class AppController {
  constructor(
    private appService: AppService,
    private appFormatter: AppFormatter
  ) {}

  @ApiOperation({
    description:
      "Get all universities defined as trusted issuers in BESU blockchain"
  })
  @ApiResponse({ status: 200, description: HTTP_200 })
  @ApiResponse({ status: 401, description: HTTP_401 })
  @Get("/v1/issuers")
  async issuers(@Query() query) {
    try {
      const size = query.page ? query.page.size ?? 10 : 10;
      const after = query.page ? query.page.after ?? 0 : 0;

      const univ = (
        await this.appService.getUniversityTrustedIssuers()
      ).map(tiUniv => this.appFormatter.formatUnivIssuer(tiUniv));
      const gov = (await this.appService.getGovTrustedIssuers()).map(tiGov =>
        this.appFormatter.formatGovIssuer(tiGov)
      );
      let result = {};
      let counter = 0;
      let maxCounter = 0;
      const items = [];
      const itemStartingFrom = after * size;
      for (let i = 0; i < univ.length; i += 1) {
        counter += 1;
        if (itemStartingFrom > counter) {
          continue;
        }
        if (maxCounter >= size) {
          continue;
        }
        maxCounter += 1;
        items.push({
          name: univ[i].preferredName,
          did: univ[i].issuerDID
        });
      }
      for (let i = 0; i < gov.length; i += 1) {
        counter += 1;
        if (itemStartingFrom >= counter) {
          continue;
        }
        if (maxCounter >= size) {
          continue;
        }
        maxCounter += 1;
        items.push({
          name: gov[i].name,
          did: gov[i].issuerDID
        });
      }
      const pages = Math.ceil((counter + 1) / size);
      if (pages - 1 < after) {
        throw new BadRequestException("invalid page number");
      }
      result = {
        items,
        total: counter,
        pageSize: size,
        first: `/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=${size}`,
        prev: `/trusted-issuers-registry/v1/issuers?page[after]=${Math.max(
          0,
          after - 1
        )}&page[size]=${size}`,
        next: `/trusted-issuers-registry/v1/issuers?page[after]=${after -
          -1}&page[size]=${size}`,
        last: `/trusted-issuers-registry/v1/issuers?page[after]=${pages -
          1}&page[size]=${size}`
      };
      return result;
    } catch (error) {
      throw new NotFoundException("error");
    }
  }

  @ApiOperation({ description: "Get trusted issuer by did" })
  @ApiResponse({ status: 200, description: "University JSON" })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @ApiResponse({ status: 401, description: HTTP_401 })
  @Get("/v1/issuers/:did")
  async issuer(@Param() params: DIDParams): Promise<Array<{}>> {
    try {
      let univTypeIssuer;
      let govTypeIssuer;
      const result = [];
      let documents = [];
      if (await this.appService.doesIssuerExists(params.did)) {
        univTypeIssuer = await this.appService.getIssuer(params.did);
        documents = await this.appService.getDocuments(params.did);
        const accs = await this.appService.getAccreditations(params.did);
        for (let i = 0; i < documents.length; i += 1) {
          documents[i].body = null;
          try {
            const downloadedDoc = await this.appService.downloadDocument(
              documents[i].vcCode
            );
            // console.log(downloadedDoc.data);
            documents[i].body = downloadedDoc
              ? downloadedDoc.status === 200
                ? downloadedDoc.data
                : null
              : "";
          } catch (error) {
            // do nothing, can't extract from besu
            Logger.warn(
              `Error at index ${i} hash ${documents[i].vcCode}. Cannot extract from besu, message: ${error.message}`
            );
          }
        }
        result.push({
          moderator: univTypeIssuer.moderator,
          issuerDID: univTypeIssuer.issuerDID,
          preferredName: univTypeIssuer.preferredName,
          alternativeName: univTypeIssuer.alternativeName,
          homepage: univTypeIssuer.homepage,
          escoOrganizationType: univTypeIssuer.escoOrganizationType,
          siteLocation: univTypeIssuer.siteLocation,
          status: univTypeIssuer.status,
          documents: documents.map(doc =>
            this.appFormatter.formatDocument(doc)
          ),
          accreditations: accs.map(acc =>
            this.appFormatter.formatAccreditation(acc)
          )
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
          documents: documents.map(document =>
            this.appFormatter.formatDocument(document)
          )
        });
      }
      if (!result.length) {
        throw new NotFoundException(
          "The format of {did} parameter is not valid or entity not found"
        );
      }
      return result;
    } catch (error) {
      throw new BadRequestException("there was a problem with besu");
    }
  }
  //
  // @ApiOperation({ description: 'Get government by DID' })
  // @ApiResponse({ status: 200, description: 'Government JSON'})
  // @ApiResponse({ status: 404, description: HTTP_404})
  // @ApiResponse({ status: 401, description: HTTP_401})
  // @Get('/governments/:did')
  // async issuerGov(@Param() params: DIDParams) {
  //   if (!(await this.appService.doesIssuerForGovExists(params.did))) {
  //     throw new NotFoundException('Government does not exist!');
  //   }
  //   const issuer = await this.appService.getIssuerForGov(params.did);
  //   const documents = await this.appService.getDocumentsForGov(params.did);
  //   return {
  //     moderator: issuer.moderator,
  //     issuerDID: issuer.issuerDID,
  //     name: issuer.name,
  //     country: issuer.country,
  //     status: issuer.status,
  //     documents: documents.map((document) => this.appFormatter.formatDocument(document)),
  //   };
  // }
  // @ApiOperation({ description: 'Get challenge to be signed with the eth address' })
  // @ApiResponse({ status: 200, description: 'Government JSON'})
  // @ApiResponse({ status: 404, description: HTTP_404})
  // @ApiResponse({ status: 401, description: HTTP_401})
  // @Get('/challenge/:did/:type')
  // async challenge(@Param() params: ChallengeParams) {
  //   switch (params.type) {
  //     case 'universities':
  //       if ((await this.appService.doesIssuerForGovExists(params.did))) {
  //         throw new NotFoundException('Government does exist!');
  //       }
  //       break;
  //     case 'governments':
  //       if ((await this.appService.doesIssuerExists(params.did))) {
  //         throw new NotFoundException('University does exist!');
  //       }
  //       break;
  //     default:
  //       throw new NotImplementedException('entity not implemented');
  //   }
  //   return this.appService.generateLoginChallenge(params.did, params.type);
  // }
}
