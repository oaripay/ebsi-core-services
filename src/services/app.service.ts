import { Injectable, Logger } from "@nestjs/common";

import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import ebsiAppJwt from "@cef-ebsi/app-jwt";
import { ConfigService } from "@nestjs/config";
import EthersService from "./ethers.service";
import GovernmentBody from "../types/GovernmentBody";
import UniversityBody from "../types/UniversityBody";
import DocumentDto from "../types/Document";
import Accreditation from "../types/Accreditation";

@Injectable()
export default class AppService {
  private readonly logger = new Logger(AppService.name);

  private univContract;

  private govContract;

  private jwtToken;

  constructor(
    private ethersService: EthersService,
    private configService: ConfigService
  ) {
    this.univContract = this.ethersService.getContracts().univContract;
    this.govContract = this.ethersService.getContracts().govContract;
  }

  getIssuer(did: string) {
    return this.univContract.getTrustedIssuer(did);
  }

  async insertGovernment(body: GovernmentBody) {
    const govTi = await this.govContract.addTrustedIssuer(
      body.issuerDID,
      body.name,
      body.country
    );
    return govTi.wait();
  }

  async insertUniversity(body: UniversityBody) {
    const univTi = await this.univContract.addTrustedIssuer(
      body.issuerDID,
      body.preferredName,
      body.alternativeName,
      body.homepage,
      body.escoOrganizationType,
      body.siteLocation
    );
    await univTi.wait();
    const univTii = await this.univContract.addTrustedIssuerIdentifiers(
      body.issuerDID,
      body.id,
      body.legalIdentifier,
      body.vatIdentifier,
      body.taxIdentifier,
      body.identifier
    );
    await univTii.wait();
  }

  async addDocumentToIssuer(did: string, body: DocumentDto) {
    const univDoc = await this.univContract.addDocument(
      did,
      body.vcCode,
      body.title,
      body.revision,
      body.status,
      body.type,
      body.dateStart
    );
    return univDoc.wait();
  }

  async addGovDocumentToIssuer(did: string, body: DocumentDto) {
    const govDoc = await this.govContract.addDocument(
      did,
      body.vcCode,
      body.title,
      body.revision,
      body.status,
      body.dateStart
    );
    return govDoc.wait();
  }

  async addAccreditationToIssuer(did: string, body: Accreditation) {
    const accUniv = await this.univContract.addAccreditation(
      did,
      body.targetFramework,
      body.targetResource
    );
    return accUniv.wait();
  }

  async getDocuments(did: string): Promise<any> {
    const documentIndexes = await this.univContract.getAllDocumentIndexes(did);
    const documentsPromises = documentIndexes.map((item) => {
      return this.univContract.getDocument(did, item);
    });
    return Promise.all(documentsPromises);
  }

  async getDocumentsForGov(did: string) {
    const documentIndexes = await this.govContract.getAllDocumentIndexes(did);
    const documentsPromises = documentIndexes.map((item) => {
      return this.govContract.getDocument(did, item);
    });
    return Promise.all(documentsPromises);
  }

  async getAccreditations(did: string) {
    const nrOfAccreditations = await this.univContract.getNrOfAccreditations(
      did
    );
    const accreditationsPromises = [];
    for (let i = 0; i < nrOfAccreditations.toNumber() - 1; i += 1) {
      accreditationsPromises.push(this.univContract.getAccreditation(did, i));
    }
    return Promise.all(accreditationsPromises);
  }

  getIssuerForGov(did: string) {
    return this.govContract.getTrustedIssuer(did);
  }

  doesIssuerExists(did: string) {
    return this.univContract.isTrustedIssuer(did);
  }

  doesIssuerForGovExists(did: string) {
    return this.govContract.isTrustedIssuer(did);
  }

  async getGovTrustedIssuers() {
    const nrOfTrustedIssuers = await this.govContract.getNrOfTrustedIssuers();
    const universityTrustedIssuersPromises = [];
    for (let i = 0; i < nrOfTrustedIssuers.toNumber(); i += 1) {
      universityTrustedIssuersPromises.push(
        this.govContract.getTrustedIssuerByIndex(i)
      );
    }
    return Promise.all(universityTrustedIssuersPromises);
  }

  async getUniversityTrustedIssuers() {
    const nrOfTrustedIssuers = await this.univContract.getNrOfTrustedIssuers();
    const universityTrustedIssuersPromises = [];
    for (let i = 0; i < nrOfTrustedIssuers.toNumber(); i += 1) {
      universityTrustedIssuersPromises.push(
        this.univContract.getTrustedIssuerByIndex(i)
      );
    }
    return Promise.all(universityTrustedIssuersPromises);
  }

  async login() {
    if (typeof this.jwtToken === "undefined") {
      try {
        const response = await this.generateLoginJWT();
        this.jwtToken = response.data.accessToken;
      } catch (error) {
        this.logger.error(
          `error received from ${this.configService
            .get("STORAGE")
            .replace(/\/$/, "")}/v1/sessions:${error.message}`
        );
        this.logger.log(error.message);
      }
    }
  }

  async generateLoginJWT() {
    // build payload for session authentication

    const agent = new ebsiAppJwt.Agent(
      "trusted-issuers-registry",
      `0x${this.configService.get("API_PRIVATE_KEY")}`
    );
    const payload = agent.createRequestPayload("ebsi-storage");
    const conf: AxiosRequestConfig = {
      headers: { "Content-Type": "application/json" },
    };
    const response = axios.post(
      `${this.configService.get("STORAGE").replace(/\/$/, "")}/v1/sessions`,
      payload,
      conf
    );

    return response;
  }

  async downloadDocument(documentHash: string): Promise<AxiosResponse<any>> {
    await this.login();
    if (typeof this.jwtToken === "undefined") {
      this.logger.warn(
        new Error(
          "JwtToken is still undefined after login. A problem occured during session authentication"
        )
      );
      return null;
    }
    try {
      const res = axios.get(
        `${this.configService
          .get("STORAGE")
          .replace(/\/$/, "")}/v1/stores/distributed/files/${documentHash}`,
        {
          headers: {
            Authorization: `Bearer ${this.jwtToken}`,
          },
        }
      );
      return res;
    } catch (Error) {
      this.logger.warn(Error);
      return null;
    }
  }
}
