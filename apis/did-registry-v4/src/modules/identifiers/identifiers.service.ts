import { Injectable, Logger } from "@nestjs/common";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { DidRegistry } from "@ebsiint-sc/did-registry-v4";
import { AsyncReturnType, publicKeyfromHexToJWK } from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service";
import { RequestCheckControllerDto } from "./dto/request-check-controller.dto";
import { InvalidRequestJsonRpcError } from "../jsonrpc/errors";
import { validateClass } from "./identifiers.utils";

@Injectable()
export default class IdentifiersService {
  private readonly logger = new Logger(IdentifiersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIdentifiers(
    page: number,
    pageSize: number,
    controller: string,
    vMethodId: string,
    vRelationship: string
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
        if ((error as Error).message.includes(`"controller doesn't exist"`)) {
          throw new NotFoundError(NotFoundError.defaultTitle, {
            detail: `Controller ${controller} not found`,
          });
        }
        throw error;
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
      return {
        items: dids,
        ...details,
      } as unknown as ReturnType<DidRegistry["getDids"]>;
    }

    return (await this.ledgerService.getContract()).getDids(page, pageSize);
  }

  async getDidDocument(
    did: string,
    validAt?: string
  ): Promise<{ [x: string]: unknown }> {
    const contract = await this.ledgerService.getContract();
    let document: AsyncReturnType<typeof contract.getDidDocument>;

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
          ? publicKeyfromHexToJWK(vMethod.publicKey)
          : (JSON.parse(
              Buffer.from(vMethod.publicKey.slice(2), "hex").toString()
            ) as unknown),
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
  }

  async checkController(
    did: string,
    body: RequestCheckControllerDto,
    id?: number | string
  ): Promise<boolean> {
    try {
      await validateClass(RequestCheckControllerDto, body);
      const contract = await this.ledgerService.getContract();
      const address = body.params[0];
      return await contract["checkController(string,address)"](did, address);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}
