import { Injectable, Logger } from "@nestjs/common";
import {
  encode,
  BadRequestError,
  NotFoundError,
  remove0xPrefix,
  getErrorMessage,
  isEthersError,
  InvalidRequestJsonRpcError,
  logAxiosError,
} from "@ebsiint-api/shared";
import type { JWK } from "jose";
import axios from "axios";
import {
  getBuiltGraphSDK,
  type GetDidDocumentQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";
import type { JsonRpcSchema } from "./validators/JsonRpcSchema.js";
import { requestCheckControllerDtoSchema } from "./validators/RequestCheckControllerSchema.js";
import { Documents, Events, Event } from "./identifiers.interface.js";
import LedgerService from "../ledger/ledger.service.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIdentifiers(
    page?: number,
    pageSize?: number,
    controller?: string,
    vMethodId?: string,
    vRelationship?: string,
  ): Promise<Documents> {
    const identifiers: string[] = [];
    const prevPageIdentifiers: string[] = [];
    const nextPageIdentifiers: string[] = [];

    let pageVar = page;
    let pagesizeVar = pageSize;

    if (!pageVar) {
      pageVar = 1;
    }

    if (!pagesizeVar) {
      pagesizeVar = 10;
    }

    const skip = (pageVar - 1) * pagesizeVar;
    const skipPrev = (pageVar - 2) * pagesizeVar;
    const skipNext = pageVar * pagesizeVar;

    if (controller) {
      if (vMethodId || vRelationship) {
        if (!vMethodId || !vRelationship) {
          throw new BadRequestError(BadRequestError.defaultTitle, {
            detail: [
              "Both verification-method-id and verification-relationship must be",
              "defined in the query to filter by verification relationship",
            ].join(" "),
          });
        }

        try {
          const res =
            await sdk.GetDidsByControllerAndVerificationRelationshipQuery({
              controller,
              skip,
              vMethodId,
              vRelationship,
              pagesize: pagesizeVar,
            });

          res.didDocuments.forEach((doc) => {
            identifiers.push(doc.id);
          });

          if (Math.sign(skipPrev) !== -1) {
            const resPrev =
              await sdk.GetDidsByControllerAndVerificationRelationshipQuery({
                controller,
                skip: skipPrev,
                vMethodId,
                vRelationship,
                pagesize: pagesizeVar,
              });

            resPrev.didDocuments.forEach((doc) => {
              prevPageIdentifiers.push(doc.id);
            });
          }

          const resNext =
            await sdk.GetDidsByControllerAndVerificationRelationshipQuery({
              controller,
              skip: skipNext,
              vMethodId,
              vRelationship,
              pagesize: pagesizeVar,
            });

          resNext.didDocuments.forEach((doc) => {
            nextPageIdentifiers.push(doc.id);
          });

          return { identifiers, prevPageIdentifiers, nextPageIdentifiers };
        } catch (error) {
          if ((error as Error).message.includes(`"controller doesn't exist"`)) {
            throw new NotFoundError(NotFoundError.defaultTitle, {
              detail: `Controller ${controller} not found`,
            });
          }
          throw new Error(getErrorMessage(error));
        }
      }

      try {
        const res = await sdk.GetDidsByController({
          controller,
          skip,
          pagesize: pagesizeVar,
        });

        res.didDocuments.forEach((doc) => {
          identifiers.push(doc.id);
        });

        if (Math.sign(skipPrev) !== -1) {
          const resPrev = await sdk.GetDidsByController({
            controller,
            skip: skipPrev,
            pagesize: pagesizeVar,
          });

          resPrev.didDocuments.forEach((doc) => {
            prevPageIdentifiers.push(doc.id);
          });
        }

        const resNext = await sdk.GetDidsByController({
          controller,
          skip: skipNext,
          pagesize: pagesizeVar,
        });

        resNext.didDocuments.forEach((doc) => {
          nextPageIdentifiers.push(doc.id);
        });

        return { identifiers, prevPageIdentifiers, nextPageIdentifiers };
      } catch (error) {
        if ((error as Error).message.includes(`"controller doesn't exist"`)) {
          throw new NotFoundError(NotFoundError.defaultTitle, {
            detail: `Controller ${controller} not found`,
          });
        }
        throw new Error(getErrorMessage(error));
      }
    }

    if (vMethodId || vRelationship) {
      if (!vMethodId || !vRelationship) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: [
            "Both verification-method-id and verification-relationship must be",
            "defined in the query to filter by verification relationship",
          ].join(" "),
        });
      }

      try {
        const res = await sdk.GetDidsByVerificationRelationship({
          vMethodId,
          vRelationship,
          skip,
          pagesize: pagesizeVar,
        });

        res.didDocuments.forEach((doc) => {
          identifiers.push(doc.id);
        });

        if (Math.sign(skipPrev) !== -1) {
          const resPrev = await sdk.GetDidsByVerificationRelationship({
            vMethodId,
            vRelationship,
            skip: skipPrev,
            pagesize: pagesizeVar,
          });

          resPrev.didDocuments.forEach((doc) => {
            prevPageIdentifiers.push(doc.id);
          });
        }

        const resNext = await sdk.GetDidsByVerificationRelationship({
          vMethodId,
          vRelationship,
          skip: skipNext,
          pagesize: pagesizeVar,
        });

        resNext.didDocuments.forEach((doc) => {
          prevPageIdentifiers.push(doc.id);
        });

        return { identifiers, prevPageIdentifiers, nextPageIdentifiers };
      } catch (error) {
        throw new NotFoundError("No identifiers found", {
          detail: "No identifiers found",
        });
      }
    }

    try {
      const res = await sdk.GetDids({ skip, pagesize: pagesizeVar });

      res.didDocuments.forEach((did) => {
        identifiers.push(did.id);
      });

      if (Math.sign(skipPrev) !== -1) {
        const resPrev = await sdk.GetDids({
          skip: skipPrev,
          pagesize: pagesizeVar,
        });

        resPrev.didDocuments.forEach((did) => {
          prevPageIdentifiers.push(did.id);
        });
      }

      const resNext = await sdk.GetDids({
        skip: skipNext,
        pagesize: pagesizeVar,
      });

      resNext.didDocuments.forEach((did) => {
        nextPageIdentifiers.push(did.id);
      });

      return { identifiers, prevPageIdentifiers, nextPageIdentifiers };
    } catch (error) {
      throw new NotFoundError("No identifiers found", {
        detail: "No identifiers found",
      });
    }
  }

  async getDidDocument(
    did: string,
    validAt?: string,
  ): Promise<Record<string, unknown>> {
    let document: GetDidDocumentQuery;

    if (!validAt) {
      const res = await sdk.GetDidDocument({ did });
      document = res;
    } else {
      const timestamp = Math.floor(new Date(validAt).getTime() / 1000);
      if (timestamp < 0) {
        throw new BadRequestError("Bad Request", {
          detail: "valid-at cannot be before 1970-01-01",
        });
      }
      const res = await sdk.GetDidDocumentByTimestamp({
        id: did,
        did,
        timestamp,
      });
      document = res;
    }

    if (!document.didDocument || !document.didDocument.baseDocument) {
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }

    if (document.didDocument.verificationRelationships.length === 0) {
      document.didDocument.controllers = [];
      document.didDocument.verificationMethods = [];
    }

    let baseDocument: Record<string, unknown>;
    try {
      baseDocument = JSON.parse(document.didDocument.baseDocument) as Record<
        string,
        unknown
      >;
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Identifier ${did} contains an invalid base document. ${
          (error as Error).message
        }`,
      });
    }

    const controller = document.didDocument.controllers
      .filter((c) => c.status === "Active")
      .map((c) => c.controller.id);

    const verificationRelationships: Record<string, string[]> = {};
    const validVerificationMethodIds: string[] = [];
    document.didDocument.verificationRelationships.forEach((vRelationship) => {
      const vMethodId = `${did}#${vRelationship.vMethodId}`;
      if (
        !document.didDocument?.verificationMethods.find(
          (v) => v.id === vMethodId && v.status === "Active",
        )
      )
        return;
      if (!verificationRelationships[vRelationship.name]) {
        verificationRelationships[vRelationship.name] = [];
      }

      verificationRelationships[vRelationship.name]!.push(vMethodId);
      validVerificationMethodIds.push(vMethodId);
    });

    let verificationMethod: Record<string, unknown>[];
    try {
      verificationMethod = document.didDocument.verificationMethods
        .filter((vMethod) => validVerificationMethodIds.includes(vMethod.id))
        .map((vMethod) => ({
          id: vMethod.id,
          type: "JsonWebKey2020",
          controller: did,
          publicKeyJwk: vMethod.isSecp256k1
            ? encode.publicKey.fromHexToJWK(vMethod.publicKey as string)
            : (JSON.parse(
                Buffer.from(
                  remove0xPrefix(vMethod.publicKey as string),
                  "hex",
                ).toString(),
              ) as JWK),
        }));
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Identifier ${did} contains an invalid public key in a verification method. ${
          (error as Error).message
        }`,
      });
    }

    return {
      id: did,
      ...baseDocument,
      controller,
      verificationMethod,
      ...verificationRelationships,
    } as Record<string, unknown>;
  }

  async getDidDocumentEvents(
    did: string,
    page?: number,
    pageSize?: number,
  ): Promise<Events> {
    let events: Event[] = [];
    let prevPageEvents: Event[] = [];
    let nextPageEvents: Event[] = [];

    let pageVar = page;
    let pagesizeVar = pageSize;

    if (!pageVar) {
      pageVar = 1;
    }

    if (!pagesizeVar) {
      pagesizeVar = 10;
    }

    const skip = (pageVar - 1) * pagesizeVar;
    const skipPrev = (pageVar - 2) * pagesizeVar;
    const skipNext = pageVar * pagesizeVar;

    try {
      const res = await sdk.GetDidDocumentEvents({
        did,
        skip,
        pagesize: pagesizeVar,
      });

      if (res.didDocument?.events) {
        events = res.didDocument?.events;
      }

      if (Math.sign(skipPrev) !== -1) {
        const resPrev = await sdk.GetDidDocumentEvents({
          did,
          skip: skipPrev,
          pagesize: pagesizeVar,
        });

        if (resPrev.didDocument?.events) {
          prevPageEvents = resPrev.didDocument?.events;
        }
      }

      const resNext = await sdk.GetDidDocumentEvents({
        did,
        skip: skipNext,
        pagesize: pagesizeVar,
      });

      if (resNext.didDocument?.events) {
        nextPageEvents = resNext.didDocument?.events;
      }

      return { events, prevPageEvents, nextPageEvents };
    } catch (error) {
      throw new NotFoundError("No identifiers found", {
        detail: "No identifiers found",
      });
    }
  }

  async checkController(
    did: string,
    body: JsonRpcSchema,
    id: number | string | null | undefined,
  ): Promise<boolean> {
    try {
      const parsedBody = requestCheckControllerDtoSchema.parse(body);
      const address = parsedBody.params[0]!;
      const contract = await this.ledgerService.getContract();
      return await contract["checkController(string,address)"](did, address);
    } catch (err) {
      if (isEthersError(err)) {
        this.logger.error(err, err.stack); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(err.reason, id); // throw simplified ethers error to the user
      }

      if (err instanceof Error) {
        if (axios.isAxiosError(err)) {
          logAxiosError(err, this.logger);
        } else {
          this.logger.error(err.message, err.stack);
        }

        const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);

        if (err.stack) {
          error.stack = err.stack;
        }

        throw error;
      }

      this.logger.error(err);
      throw err;
    }
  }
}
