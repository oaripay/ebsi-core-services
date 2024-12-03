import type { JWK } from "jose";

import {
  BadRequestError,
  encode,
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { DidRegistry } from "@ebsiint-sc/did-registry-v2";
import { Injectable, Logger } from "@nestjs/common";

import { LedgerService } from "../ledger/ledger.service.js";
import { RequestCheckControllerDto } from "./dto/request-check-controller.dto.js";
import { validateClass } from "./identifiers.utils.js";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  // compatibility - legacy API v3

  async checkController(
    did: string,
    body: RequestCheckControllerDto,
    id: null | number | string,
  ): Promise<boolean> {
    try {
      await validateClass(RequestCheckControllerDto, body);
      const contract = this.ledgerService.getContract();
      const address = body.params[0]!;
      return await contract["checkController(string,address)"](did, address);
    } catch (error_) {
      if (isEthersError(error_)) {
        this.logger.error(error_, error_.stack); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(error_.reason, id); // throw simplified ethers error to the user
      }
      if (error_ instanceof Error) {
        const error = new InvalidRequestJsonRpcError(error_.message, id);

        if (error_ instanceof Error && error_.stack) {
          error.stack = error_.stack;
        }

        throw error;
      }
      throw error_;
    }
  }

  // API v4

  async getDidDocument(
    did: string,
    validAt?: string,
  ): Promise<Record<string, unknown>> {
    const contract = this.ledgerService.getContract();
    let document: Awaited<ReturnType<typeof contract.getDidDocument>>;

    try {
      if (validAt) {
        const timestamp = Math.floor(new Date(validAt).getTime() / 1000);
        document = await contract.getDidDocumentByTimestamp(did, timestamp);
      } else {
        document = await contract.getDidDocument(did);
      }

      if (!document.baseDocument) {
        try {
          return await this.getDidDocumentV3(did);
        } catch {
          throw new NotFoundError("Identifier Not Found", {
            detail: `Identifier ${did} not found`,
          });
        }
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
          controller: did,
          id: `${did}#${document.vMethodIds[i]}`,
          publicKeyJwk: vMethod.isSecp256k1
            ? encode.publicKey.fromHexToJWK(vMethod.publicKey)
            : (JSON.parse(
                Buffer.from(
                  remove0xPrefix(vMethod.publicKey),
                  "hex",
                ).toString(),
              ) as JWK),
          type: "JsonWebKey2020",
        }));
      } catch (error) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: `Identifier ${did} contains an invalid public key in a verification method. ${
            (error as Error).message
          }`,
        });
      }

      const verificationRelationships: Record<string, string[]> = {};
      for (const vRelationship of document.vRelationships) {
        if (!verificationRelationships[vRelationship.name]) {
          verificationRelationships[vRelationship.name] = [];
        }
        verificationRelationships[vRelationship.name]!.push(
          `${did}#${vRelationship.vMethodId}`,
        );
      }

      return {
        ...baseDocument,
        controller: document.controllers,
        id: did,
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

  async getDidDocumentV3(did: string): Promise<Record<string, unknown>> {
    const hexDid = `0x${Buffer.from(did).toString("hex")}`;
    const latestDidDoc = await this.ledgerService
      .getContractV1()
      .getLatestDidDocumentVersion(hexDid);
    return JSON.parse(
      Buffer.from(remove0xPrefix(latestDidDoc), "hex").toString(),
    ) as Record<string, unknown>;
  }

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
        return await this.ledgerService
          .getContract()
          .getDidsByController(controller, page, pageSize);
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
        const didsWithPeriod = await this.ledgerService
          .getContract()
          .getDidsByVerificationRelationship(
            vMethodId,
            vRelationship,
            page,
            pageSize,
          );
        const dids: string[] = [];
        const now = Math.floor(Date.now() / 1000);
        for (const didWithPeriod of didsWithPeriod.items) {
          if (
            didWithPeriod.notBefore.toNumber() <= now &&
            now <= didWithPeriod.notAfter.toNumber()
          ) {
            dids.push(didWithPeriod.did);
          }
        }
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
      return await this.ledgerService.getContract().getDids(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("No identifiers found", {
        detail: "No identifiers found",
      });
    }
  }
}
