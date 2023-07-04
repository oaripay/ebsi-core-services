import { Injectable, Logger } from "@nestjs/common";
import {
  encode,
  BadRequestError,
  NotFoundError,
  InvalidRequestJsonRpcError,
  remove0xPrefix,
  isEthersError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { DidRegistry } from "@ebsiint-sc/did-registry-v2";
import { LedgerService } from "../ledger/ledger.service";
import { RequestCheckControllerDto } from "./dto/request-check-controller.dto";
import { validateClass } from "./identifiers.utils";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  // compatibility - legacy API v3

  async getDidDocumentV3(did: string): Promise<{ [x: string]: unknown }> {
    const hexDid = `0x${Buffer.from(did).toString("hex")}`;
    const latestDidDoc = await (
      await this.ledgerService.getContractV1()
    ).getLatestDidDocumentVersion(hexDid);
    return JSON.parse(
      Buffer.from(remove0xPrefix(latestDidDoc), "hex").toString()
    ) as { [x: string]: unknown };
  }

  // API v4

  async getIdentifiers(
    page: number,
    pageSize: number,
    controller?: string,
    vMethodId?: string,
    vRelationship?: string
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
          this.logger.error(error);
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
          pageSize
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
          this.logger.error(error);
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
        this.logger.error(error);
      }
      throw new NotFoundError("No identifiers found", {
        detail: "No identifiers found",
      });
    }
  }

  async getDidDocument(
    did: string,
    validAt?: string
  ): Promise<{ [x: string]: unknown }> {
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
        try {
          return await this.getDidDocumentV3(did);
        } catch (error) {
          throw new NotFoundError("Identifier Not Found", {
            detail: `Identifier ${did} not found`,
          });
        }
      }

      let baseDocument: { [x: string]: unknown };
      try {
        baseDocument = JSON.parse(document.baseDocument) as {
          [x: string]: unknown;
        };
      } catch (error) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: `Identifier ${did} contains an invalid base document. ${
            (error as Error).message
          }`,
        });
      }

      let verificationMethod: { [x: string]: unknown }[];
      try {
        verificationMethod = document.vMethods.map((vMethod, i) => ({
          id: `${did}#${document.vMethodIds[i]}`,
          type: "JsonWebKey2020",
          controller: did,
          publicKeyJwk: vMethod.isSecp256k1
            ? encode.publicKey.fromHexToJWK(vMethod.publicKey)
            : JSON.parse(
                Buffer.from(remove0xPrefix(vMethod.publicKey), "hex").toString()
              ),
        }));
      } catch (error) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: `Identifier ${did} contains an invalid public key in a verification method. ${
            (error as Error).message
          }`,
        });
      }

      const verificationRelationships: { [x: string]: string[] } = {};
      document.vRelationships.forEach((vRelationship) => {
        if (!verificationRelationships[vRelationship.name]) {
          verificationRelationships[vRelationship.name] = [];
        }
        verificationRelationships[vRelationship.name].push(
          `${did}#${vRelationship.vMethodId}`
        );
      });

      return {
        ...baseDocument,
        id: did,
        controller: document.controllers,
        verificationMethod,
        ...verificationRelationships,
      } as { [x: string]: unknown };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
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
    body: RequestCheckControllerDto,
    id: number | string | null
  ): Promise<boolean> {
    try {
      await validateClass(RequestCheckControllerDto, body);
      const contract = await this.ledgerService.getContract();
      const address = body.params[0];
      return await contract["checkController(string,address)"](did, address);
    } catch (err) {
      if (isEthersError(err)) {
        this.logger.error(err); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(err.reason, id); // throw simplified ethers error to the user
      }
      if (err instanceof Error) {
        const error = new InvalidRequestJsonRpcError(err.message, id);
        error.stack = err.stack;
        throw error;
      }
      throw err;
    }
  }
}
