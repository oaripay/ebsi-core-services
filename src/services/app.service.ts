import { Injectable, Logger } from "@nestjs/common";

import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { Agent, Scope } from "@cef-ebsi/app-jwt";
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

  getUniversity(did: string) {
    return this.univContract.getTrustedIssuer(did);
  }

  getGovernment(did: string) {
    return this.govContract.getTrustedIssuer(did);
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

  async addDocumentToUniversity(did: string, body: DocumentDto) {
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

  async addDocumentToGovernment(did: string, body: DocumentDto) {
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

  async addAccreditationToUniversity(did: string, body: Accreditation) {
    const accUniv = await this.univContract.addAccreditation(
      did,
      body.targetFramework,
      body.targetResource
    );
    return accUniv.wait();
  }

  async getDocumentsByUniversity(did: string): Promise<any> {
    const documentIndexes = await this.univContract.getAllDocumentIndexes(did);
    const documentsPromises = documentIndexes.map((item) => {
      return this.univContract.getDocument(did, item);
    });
    return Promise.all(documentsPromises);
  }

  async getDocumentsByGovernment(did: string) {
    const documentIndexes = await this.govContract.getAllDocumentIndexes(did);
    const documentsPromises = documentIndexes.map((item) => {
      return this.govContract.getDocument(did, item);
    });
    return Promise.all(documentsPromises);
  }

  async getAccreditationsUniversity(did: string) {
    const nrOfAccreditations = await this.univContract.getNrOfAccreditations(
      did
    );
    const accreditationsPromises = [];
    for (let i = 0; i < nrOfAccreditations.toNumber() - 1; i += 1) {
      accreditationsPromises.push(this.univContract.getAccreditation(did, i));
    }
    return Promise.all(accreditationsPromises);
  }

  doesUniversityExists(did: string) {
    return this.univContract.isTrustedIssuer(did);
  }

  doesGovernmentExists(did: string) {
    return this.govContract.isTrustedIssuer(did);
  }

  async getGovernments() {
    const nrOfTrustedIssuers = await this.govContract.getNrOfTrustedIssuers();
    const universityTrustedIssuersPromises = [];
    for (let i = 0; i < nrOfTrustedIssuers.toNumber(); i += 1) {
      universityTrustedIssuersPromises.push(
        this.govContract.getTrustedIssuerByIndex(i)
      );
    }
    return Promise.all(universityTrustedIssuersPromises);
  }

  async getUniversities() {
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
        let { message } = error;
        if (error.response && error.response.data) {
          if (typeof error.response.data === "object")
            message = `${message}: ${JSON.stringify(error.response.data)}`;
          else message = `${message}: ${error.response.data}`;
        }
        this.logger.error(
          `error received from ${this.configService
            .get("STORAGE")
            .replace(/\/$/, "")}/v1/sessions: ${message}`
        );
        this.logger.log(message);
      }
    }
  }

  async generateLoginJWT() {
    // build payload for session authentication
    const agent = new Agent(
      Scope.COMPONENT,
      this.configService.get("API_PRIVATE_KEY"),
      {
        issuer: "trusted-issuers-registry",
      }
    );
    const payload = await agent.createRequestPayload("ebsi-storage");

    const conf: AxiosRequestConfig = {
      headers: { "Content-Type": "application/json" },
    };

    return axios.post(
      `${this.configService.get("STORAGE").replace(/\/$/, "")}/v1/sessions`,
      payload,
      conf
    );
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
          validateStatus: () => true,
        }
      );
      return res;
    } catch (Error) {
      this.logger.warn(Error);
      return null;
    }
  }
}
