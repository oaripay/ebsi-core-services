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
  InternalServerError,
} from "@ebsiint-api/shared";
import type { JWK } from "jose";
import axios from "axios";
import {
  getBuiltGraphSDK,
  GetDidDocumentEventsQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";
import type { JsonRpcSchema } from "./validators/JsonRpcSchema.js";
import { requestCheckControllerDtoSchema } from "./validators/RequestCheckControllerSchema.js";
import LedgerService from "../ledger/ledger.service.js";
import { Event } from "./identifiers.interface.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIdentifiers(
    page = 1,
    pagesize = 10,
    controller?: string,
    vMethodId?: string,
    vRelationship?: string,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    // get one more item to clarify next pages in pagination
    const queryPageSize = pagesize + 1;

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
              pagesize: queryPageSize,
            });

          const identifiers = res.didDocuments.map((d) => d.id);
          return { items: identifiers };
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
          pagesize: queryPageSize,
        });

        const identifiers = res.didDocuments.map((d) => d.id);
        return { items: identifiers };
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
          pagesize: queryPageSize,
        });

        const identifiers = res.didDocuments.map((d) => d.id);
        return { items: identifiers };
      } catch (error) {
        throw new NotFoundError("No identifiers found", {
          detail: "No identifiers found",
        });
      }
    }

    try {
      const res = await sdk.GetDids({ skip, pagesize: queryPageSize });

      const identifiers = res.didDocuments.map((d) => d.id);
      return { items: identifiers };
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
    const timestamp = validAt
      ? Math.floor(new Date(validAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    if (timestamp < 0) {
      throw new BadRequestError("Bad Request", {
        detail: "valid-at cannot be before 1970-01-01",
      });
    }

    const document = await sdk.GetDidDocumentByTimestamp({
      id: did,
      did,
      timestamp,
    });

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
          (v) => v.id === vMethodId,
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
    page = 1,
    pagesize = 10,
  ): Promise<{ items: Event[] }> {
    const skip = (page - 1) * pagesize;

    // get one more item to clarify next pages in pagination
    const queryPageSize = pagesize + 1;

    let res: GetDidDocumentEventsQuery;
    try {
      res = await sdk.GetDidDocumentEvents({
        did,
        skip,
        pagesize: queryPageSize,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.didDocument) {
      throw new NotFoundError("Identifier Not Found", {
        detail: `Identifier ${did} not found`,
      });
    }

    return { items: res.didDocument.events };
  }

  async checkController(
    did: string,
    body: JsonRpcSchema,
    id: number | string | null | undefined,
  ): Promise<boolean> {
    try {
      const parsedBody = requestCheckControllerDtoSchema.parse(body);
      const address = parsedBody.params[0]!;
      const contract = this.ledgerService.getContract();
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
