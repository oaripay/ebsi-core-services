import type { JWK } from "jose";

import {
  BadRequestError,
  encode,
  getErrorMessage,
  InternalServerError,
  InvalidRequestJsonRpcError,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import type {
  GetControllersQuery,
  GetDidDocumentEventsQuery,
} from "../../../.graphclient/index.js";
import type { Event } from "./identifiers.interface.ts";
import type { JsonRpcSchema } from "./validators/JsonRpcSchema.ts";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";
import { requestCheckControllerDtoSchema } from "./validators/RequestCheckControllerSchema.ts";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  async checkController(
    did: string,
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<boolean> {
    let address: string;
    try {
      const parsedBody = requestCheckControllerDtoSchema.parse(body);
      address = parsedBody.params[0]!;
    } catch (error_) {
      if (error_ instanceof Error) {
        const error = new InvalidRequestJsonRpcError(
          getErrorMessage(error_),
          id,
        );
        if (error_.stack) {
          error.stack = error_.stack;
        }

        throw error;
      }

      this.logger.error(error_);
      throw error_;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    let res: GetControllersQuery;
    try {
      res = await sdk.GetControllers({ did, timestamp });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.didDocument) {
      throw new InvalidRequestJsonRpcError("Identifier Not Found", id);
    }

    for (let i = 0, k = res.didDocument.controllers.length; i < k; i += 1) {
      const { controller } = res.didDocument.controllers[i]!;
      for (
        let j = 0,
          verificationRelationshipsLength =
            controller.verificationRelationships.length;
        j < verificationRelationshipsLength;
        j += 1
      ) {
        const relationship = controller.verificationRelationships[j];
        if (relationship?.vMethodId) {
          const vMethod = controller.verificationMethods.find(
            (v) => v.id === `${did}#${relationship.vMethodId}`,
          );
          if (vMethod) {
            const vMethodAddress = ethers.computeAddress(
              vMethod.publicKey as string,
            );
            if (vMethodAddress.toLowerCase() === address.toLowerCase()) {
              return true;
            }
          }
        }
      }
    }

    return false;
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
      did,
      id: did,
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
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }

    const controller = document.didDocument.controllers
      .filter((c) => c.status === "Active")
      .map((c) => c.controller.id);

    const verificationRelationships: Record<string, string[]> = {};
    const validVerificationMethodIds: string[] = [];
    for (const vRelationship of document.didDocument
      .verificationRelationships) {
      const vMethodId = `${did}#${vRelationship.vMethodId}`;
      if (
        !document.didDocument?.verificationMethods.find(
          (v) => v.id === vMethodId,
        )
      )
        continue;
      if (!verificationRelationships[vRelationship.name]) {
        verificationRelationships[vRelationship.name] = [];
      }

      verificationRelationships[vRelationship.name]!.push(vMethodId);
      validVerificationMethodIds.push(vMethodId);
    }

    let verificationMethod: Record<string, unknown>[];
    try {
      verificationMethod = document.didDocument.verificationMethods
        .filter((vMethod) => validVerificationMethodIds.includes(vMethod.id))
        .map((vMethod) => ({
          controller: did,
          id: vMethod.id,
          publicKeyJwk: vMethod.isSecp256k1
            ? encode.publicKey.fromHexToJWK(vMethod.publicKey as string)
            : (JSON.parse(
                Buffer.from(
                  remove0xPrefix(vMethod.publicKey as string),
                  "hex",
                ).toString(),
              ) as JWK),
          type: "JsonWebKey2020",
        }));
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Identifier ${did} contains an invalid public key in a verification method. ${
          error instanceof Error ? error.message : "Unknown error"
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
        pagesize: queryPageSize,
        skip,
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
              pagesize: queryPageSize,
              skip,
              vMethodId,
              vRelationship,
            });
          if (!res.didDocuments) return { items: [] };

          const identifiers = res.didDocuments.map((d) => d.id);
          return { items: identifiers };
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("controller doesn't exist")
          ) {
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
          pagesize: queryPageSize,
          skip,
        });
        if (!res.didDocuments) return { items: [] };

        const identifiers = res.didDocuments.map((d) => d.id);
        return { items: identifiers };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("controller doesn't exist")
        ) {
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
          pagesize: queryPageSize,
          skip,
          vMethodId,
          vRelationship,
        });
        if (!res.didDocuments) return { items: [] };

        const identifiers = res.didDocuments.map((d) => d.id);
        return { items: identifiers };
      } catch {
        throw new NotFoundError("No identifiers found", {
          detail: "No identifiers found",
        });
      }
    }

    try {
      const res = await sdk.GetDids({ pagesize: queryPageSize, skip });
      if (!res.didDocuments) return { items: [] };

      const identifiers = res.didDocuments.map((d) => d.id);
      return { items: identifiers };
    } catch {
      throw new NotFoundError("No identifiers found", {
        detail: "No identifiers found",
      });
    }
  }
}
