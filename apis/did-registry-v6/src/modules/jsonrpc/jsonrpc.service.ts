import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  InvalidRequestJsonRpcError,
  isEthersError,
  getErrorMessage,
  extractNamedAttributes,
  logAxiosError,
} from "@ebsiint-api/shared";
import { DidRegistry } from "@ebsiint-sc/did-registry-v4";
import axios from "axios";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE } from "../auth/auth.constants.js";
import {
  insertDidDocumentSchema,
  requestInsertDidDocumentDtoSchema,
} from "./validators/RequestInsertDidDocumentSchema.js";
import {
  updateBaseDocumentSchema,
  requestUpdateBaseDocumentDtoSchema,
} from "./validators/RequestUpdateBaseDocumentSchema.js";
import {
  addServiceSchema,
  requestAddServiceDtoSchema,
} from "./validators/RequestAddServiceSchema.js";
import {
  revokeServiceSchema,
  requestRevokeServiceDtoSchema,
} from "./validators/RequestRevokeServiceSchema.js";
import {
  addControllerSchema,
  requestAddControllerDtoSchema,
} from "./validators/RequestAddControllerSchema.js";
import {
  revokeControllerSchema,
  requestRevokeControllerDtoSchema,
} from "./validators/RequestRevokeControllerSchema.js";
import {
  addVerificationMethodSchema,
  requestAddVerificationMethodDtoSchema,
} from "./validators/RequestAddVerificationMethodSchema.js";
import {
  addVerificationRelationshipSchema,
  requestAddVerificationRelationshipDtoSchema,
} from "./validators/RequestAddVerificationRelationshipSchema.js";
import {
  revokeVerificationMethodSchema,
  requestRevokeVerificationMethodDtoSchema,
} from "./validators/RequestRevokeVerificationMethodSchema.js";
import {
  expireVerificationMethodSchema,
  requestExpireVerificationMethodDtoSchema,
} from "./validators/RequestExpireVerificationMethodSchema.js";
import {
  rollVerificationMethodSchema,
  requestRollVerificationMethodDtoSchema,
} from "./validators/RequestRollVerificationMethodSchema.js";
import {
  requestSendSignedTransactionDtoSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
} from "./validators/RequestSendSignedTransactionSchema.js";
import type { JsonRpcSchema } from "./validators/JsonRpcSchema.js";

function assertScopeContains(
  scope: string,
  validScopes: string | string[],
  methodName: string,
) {
  const expectedScopes = Array.isArray(validScopes)
    ? validScopes
    : [validScopes];

  if (!expectedScopes.some((scp) => scope.includes(scp))) {
    throw new Error(
      `'${methodName}' requires an access token with the scope '${expectedScopes.join(
        "' or '",
      )}'`,
    );
  }
}

function assertDidMatchesSub(did: string, sub: string) {
  if (did !== sub) {
    throw new Error("Access token sub doesn't match the DID from the payload");
  }
}

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId?: string;

  private readonly contractAddress: string;

  constructor(private ledgerService: LedgerService) {
    this.contractAddress = ledgerService.getContractAddress();
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      try {
        const { chainId } = await (
          await this.ledgerService.getContract()
        ).provider.getNetwork();
        this.chainId = ethers.BigNumber.from(chainId).toHexString();
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new Error(getErrorMessage(error));
      }
    }
    return this.chainId;
  }

  async estimateGas(
    transaction: UnsignedTransaction,
  ): Promise<ethers.BigNumber> {
    const { from, to, data, value } = transaction;

    try {
      return await (
        await this.ledgerService.getContract()
      ).provider.estimateGas({
        from,
        to,
        data,
        value,
      });
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async verifyTransaction(
    clientId: string,
    param: SendSignedTransactionParamsSchema,
    scope: string,
  ): Promise<{ signer: string; functionName: string }> {
    const { unsignedTransaction, r, s, v, signedRawTransaction } = param;

    const unsignedTx = formatEthersUnsignedTransaction(unsignedTransaction);
    const signature = formatEthersSignature(r, s, v);

    // Serialize transaction with and without signature
    const serializedTransaction = ethers.utils.serializeTransaction(unsignedTx);
    const serializedTransactionSigned = ethers.utils.serializeTransaction(
      unsignedTx,
      signature,
    );

    if (serializedTransactionSigned !== signedRawTransaction) {
      throw new Error(
        `The unsigned transaction + signature (${serializedTransactionSigned}) does not match with the signedRawTransaction (${signedRawTransaction})`,
      );
    }

    // recover address used to sign
    const digest = ethers.utils.keccak256(serializedTransaction);
    const signer = ethers.utils.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase()) {
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `,
      );
    }

    const chainId = await this.getChainId();
    if (unsignedTransaction.chainId !== chainId) {
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`,
      );
    }

    if (unsignedTransaction.to !== this.contractAddress) {
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`,
      );
    }

    // verify function and parameters encoded in unsignedTransaction.data
    const { args, functionFragment } = (
      await this.ledgerService.getContract()
    ).interface.parseTransaction(unsignedTransaction);

    // Extract named args from args (args is a mixed array with named and unnamed values)
    const argsObject = {
      ...extractNamedAttributes(args),
      from: unsignedTransaction.from,
    };

    switch (functionFragment.name) {
      case "insertDidDocument": {
        assertScopeContains(
          scope,
          [DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE],
          functionFragment.name,
        );

        const castArgs = await insertDidDocumentSchema.parseAsync(argsObject);

        if (scope.includes(DIDR_INVITE_SCOPE)) {
          assertDidMatchesSub(castArgs.did, clientId);
        }
        break;
      }
      case "updateBaseDocument": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await updateBaseDocumentSchema.parseAsync(argsObject);
        break;
      }
      case "addService": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await addServiceSchema.parseAsync(argsObject);
        break;
      }
      case "revokeService": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await revokeServiceSchema.parseAsync(argsObject);
        break;
      }
      case "addController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await addControllerSchema.parseAsync(argsObject);
        break;
      }
      case "revokeController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await revokeControllerSchema.parseAsync(argsObject);
        break;
      }
      case "addVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await addVerificationMethodSchema.parseAsync(argsObject);
        break;
      }
      case "addVerificationRelationship": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await addVerificationRelationshipSchema.parseAsync(argsObject);
        break;
      }
      case "revokeVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await revokeVerificationMethodSchema.parseAsync(argsObject);
        break;
      }
      case "expireVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await expireVerificationMethodSchema.parseAsync(argsObject);
        break;
      }
      case "rollVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);

        await rollVerificationMethodSchema.parseAsync({
          ...argsObject,
          args: extractNamedAttributes(args["args"]),
        });

        break;
      }
      default:
        throw new Error(
          `The function name ${functionFragment.name} can not be used in this context`,
        );
    }

    return {
      signer,
      functionName: functionFragment.name,
    };
  }

  async buildTransaction(
    from: string,
    params: string,
  ): Promise<UnsignedTransaction> {
    try {
      const nonceInt = await (
        await this.ledgerService.getContract()
      ).provider.getTransactionCount(from);

      const unsignedTransaction: UnsignedTransaction = {
        from,
        to: this.contractAddress,
        data: params,
        value: "0x0",
        nonce: ethers.BigNumber.from(nonceInt).toHexString(),
        chainId: await this.getChainId(),
        gasLimit: "0x1000000",
        gasPrice: "0x0",
      };

      let gasEstimation: string | ethers.BigNumber = "unset";

      try {
        gasEstimation = await this.estimateGas(unsignedTransaction);
        // Multiply by 1.4
        unsignedTransaction.gasLimit = gasEstimation
          .mul(14)
          .div(10)
          .toHexString();
      } catch (error) {
        this.logger.warn(
          `Gas could not be estimated.${
            gasEstimation === "unset"
              ? ""
              : `Received ${gasEstimation.toString()}.`
          } Using 0x1000000`,
        );
        unsignedTransaction.gasLimit = "0x1000000";
      }

      return unsignedTransaction;
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error("Could not build transaction.");
    }
  }

  async buildTransactionInsertDidDocument(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_INVITE_SCOPE or DIDR_WRITE_SCOPE scope
      assertScopeContains(
        scope,
        [DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE],
        "insertDidDocument",
      );

      const parsedBody =
        await requestInsertDidDocumentDtoSchema.parseAsync(body);

      const {
        from,
        did,
        baseDocument,
        vMethodId,
        publicKey,
        isSecp256k1,
        notBefore,
        notAfter,
      } = parsedBody.params[0]!;

      if (scope.includes(DIDR_INVITE_SCOPE)) {
        // Verify that the Access Token sub and the payload DID match
        assertDidMatchesSub(did, sub);
      }

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertDidDocument", [
        did,
        baseDocument,
        vMethodId,
        publicKey,
        isSecp256k1,
        notBefore,
        notAfter,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async getDidDocument(did: string): ReturnType<DidRegistry["getDidDocument"]> {
    const contract = await this.ledgerService.getContract();
    try {
      return await contract.getDidDocument(did);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
        // Throw a generic error to avoid leaking information.
        throw new InvalidRequestJsonRpcError(
          `Identifier ${did} Not Found`,
          did,
        );
      }

      throw error;
    }
  }

  async buildTransactionAddService(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ) {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      const parsedBody = await requestAddServiceDtoSchema.parseAsync(body);

      const { from, did, service } = parsedBody.params[0]!;

      const didDocument = await this.getDidDocument(did);

      let baseDocument: { [x: string]: unknown; service?: unknown[] };
      try {
        baseDocument = JSON.parse(didDocument.baseDocument) as Record<
          string,
          unknown
        >;
      } catch (error) {
        throw new InvalidRequestJsonRpcError(
          `Identifier ${did} contains an invalid base document. ${
            (error as Error).message
          }`,
          id,
        );
      }

      if (!baseDocument.service) {
        baseDocument.service = [];
      }

      baseDocument.service.push(JSON.parse(service));

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateBaseDocument", [
        did,
        JSON.stringify(baseDocument),
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeService(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ) {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      const parsedBody = await requestRevokeServiceDtoSchema.parseAsync(body);

      const { from, did, serviceId } = parsedBody.params[0]!;

      const didDocument = await this.getDidDocument(did);

      let baseDocument: { [x: string]: unknown; service?: { id: string }[] };
      try {
        baseDocument = JSON.parse(didDocument.baseDocument) as Record<
          string,
          unknown
        >;
      } catch (error) {
        throw new InvalidRequestJsonRpcError(
          `Identifier ${did} contains an invalid base document. ${
            (error as Error).message
          }`,
          id,
        );
      }

      if (baseDocument.service) {
        const i = baseDocument.service.findIndex((s) => s.id === serviceId);
        if (i !== -1) {
          baseDocument.service.splice(i, 1);
        }
      }

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateBaseDocument", [
        did,
        JSON.stringify(baseDocument),
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateBaseDocument(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      const parsedBody =
        await requestUpdateBaseDocumentDtoSchema.parseAsync(body);

      const { from, did, baseDocument } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateBaseDocument", [did, baseDocument]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddController(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addController");

      const parsedBody = await requestAddControllerDtoSchema.parseAsync(body);

      const { from, did, controller } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("addController", [did, controller]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeController(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeController");

      const parsedBody =
        await requestRevokeControllerDtoSchema.parseAsync(body);

      const { from, did, controller } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeController", [did, controller]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddVerificationMethod(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addVerificationMethod");

      const parsedBody =
        await requestAddVerificationMethodDtoSchema.parseAsync(body);

      const { from, did, vMethodId, publicKey, isSecp256k1 } =
        parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("addVerificationMethod", [
        did,
        vMethodId,
        publicKey,
        isSecp256k1,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddVerificationRelationship(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(
        scope,
        DIDR_WRITE_SCOPE,
        "addVerificationRelationship",
      );

      const parsedBody =
        await requestAddVerificationRelationshipDtoSchema.parseAsync(body);

      const { from, did, name, vMethodId, notBefore, notAfter } =
        parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("addVerificationRelationship", [
        did,
        name,
        vMethodId,
        notBefore,
        notAfter,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeVerificationMethod(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeVerificationMethod");

      const parsedBody =
        await requestRevokeVerificationMethodDtoSchema.parseAsync(body);

      const { from, did, vMethodId, notAfter } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeVerificationMethod", [
        did,
        vMethodId,
        notAfter,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionExpireVerificationMethod(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "expireVerificationMethod");

      const parsedBody =
        await requestExpireVerificationMethodDtoSchema.parseAsync(body);

      const { from, did, vMethodId, notAfter } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("expireVerificationMethod", [
        did,
        vMethodId,
        notAfter,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionRollVerificationMethod(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "rollVerificationMethod");

      const parsedBody =
        await requestRollVerificationMethodDtoSchema.parseAsync(body);

      const { from, args } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("rollVerificationMethod", [args]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async sendTransaction(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<string> {
    try {
      const parsedBody =
        await requestSendSignedTransactionDtoSchema.parseAsync(body);

      const request = parsedBody.params[0]!;

      await this.verifyTransaction(sub, request, scope);

      const tx = await (
        await this.ledgerService.getContract()
      ).provider.sendTransaction(request.signedRawTransaction);

      return tx.hash;
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

export default { JsonRpcService };
