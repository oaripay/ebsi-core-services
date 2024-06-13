import { Injectable, Logger } from "@nestjs/common";
import {
  encode,
  BadRequestError,
  NotFoundError,
  InvalidRequestJsonRpcError,
  remove0xPrefix,
  isEthersError,
  getErrorMessage,
  logAxiosError,
} from "@ebsiint-api/shared";
import { DidRegistry } from "@ebsiint-sc/did-registry-v3";
import type { JWK } from "jose";
import axios from "axios";
import { LedgerService } from "../ledger/ledger.service.js";
import type { JsonRpcSchema } from "./validators/JsonRpcSchema.js";
import { requestCheckControllerDtoSchema } from "./validators/RequestCheckControllerSchema.js";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIdentifiers(
    page: number,
    pageSize: number,
    controller?: string,
    vMethodId?: string,
    vRelationship?: string,
  ): ReturnType<DidRegistry["getDids"]> {
    if (controller) {
      if (vMethodId || vRelationship) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail:
            "It is not possible to filter by controller and verification relationship",
        });
      }

      try {
        return await (
          await this.ledgerService.getContract()
        ).getDidsByController(controller, page, pageSize);
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
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
        const didsWithPeriod = await (
          await this.ledgerService.getContract()
        ).getDidsByVerificationRelationship(
          vMethodId,
          vRelationship,
          page,
          pageSize,
        );
        const dids: string[] = [];
        const now = Math.floor(Date.now() / 1000);
        didsWithPeriod.items.forEach((didWithPeriod) => {
          if (
            didWithPeriod.notBefore.toNumber() <= now &&
            now <= didWithPeriod.notAfter.toNumber()
          ) {
            dids.push(didWithPeriod.did);
          }
        });
        const { items, ...details } = didsWithPeriod;
        return await ({
          items: dids,
          ...details,
        } as unknown as ReturnType<DidRegistry["getDids"]>);
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new NotFoundError("No identifiers found", {
          detail: "No identifiers found",
        });
      }
    }

    try {
      return await (
        await this.ledgerService.getContract()
      ).getDids(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("No identifiers found", {
        detail: "No identifiers found",
      });
    }
  }

  async getDidDocument(
    did: string,
    validAt?: string,
  ): Promise<Record<string, unknown>> {
    const contract = await this.ledgerService.getContract();
    let document: Awaited<ReturnType<typeof contract.getDidDocument>>;

    try {
      if (!validAt) {
        document = await contract.getDidDocument(did);
      } else {
        const timestamp = Math.floor(new Date(validAt).getTime() / 1000);
        document = await contract.getDidDocumentByTimestamp(did, timestamp);
      }

      if (!document.baseDocument) {
        throw new NotFoundError("Identifier Not Found", {
          detail: `Identifier ${did} not found`,
        });
      }

      let baseDocument: Record<string, unknown>;
      try {
        baseDocument = JSON.parse(document.baseDocument) as Record<
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

      let verificationMethod: Record<string, unknown>[];
      try {
        verificationMethod = document.vMethods.map((vMethod, i) => ({
          id: `${did}#${document.vMethodIds[i]}`,
          type: "JsonWebKey2020",
          controller: did,
          publicKeyJwk: vMethod.isSecp256k1
            ? encode.publicKey.fromHexToJWK(vMethod.publicKey)
            : (JSON.parse(
                Buffer.from(
                  remove0xPrefix(vMethod.publicKey),
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

      const verificationRelationships: Record<string, string[]> = {};
      document.vRelationships.forEach((vRelationship) => {
        if (!verificationRelationships[vRelationship.name]) {
          verificationRelationships[vRelationship.name] = [];
        }
        verificationRelationships[vRelationship.name]!.push(
          `${did}#${vRelationship.vMethodId}`,
        );
      });

      return {
        ...baseDocument,
        id: did,
        controller: document.controllers,
        verificationMethod,
        ...verificationRelationships,
      } as Record<string, unknown>;
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
        // Throw a generic error to avoid leaking information.
        throw new NotFoundError("Identifier Not Found", {
          detail: `Identifier ${did} not found`,
        });
      }

      throw error;
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
