import {
  extractNamedAttributes,
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  logAxiosError,
} from "@ebsiint-api/shared";
import { DidRegistry } from "@ebsiint-sc/did-registry-v3";
import { Injectable, Logger } from "@nestjs/common";
import { isAxiosError } from "axios";
import { ethers } from "ethers";
import { stringify } from "safe-stable-stringify";

import type { JsonRpcSchema } from "./validators/JsonRpcSchema.js";

import { DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE } from "../auth/auth.constants.js";
import { LedgerService } from "../ledger/ledger.service.js";
import {
  formatEthersSignature,
  formatEthersUnsignedTransaction,
} from "./jsonrpc.utils.js";
import {
  addControllerSchema,
  requestAddControllerDtoSchema,
} from "./validators/RequestAddControllerSchema.js";
import {
  addServiceSchema,
  requestAddServiceDtoSchema,
} from "./validators/RequestAddServiceSchema.js";
import {
  addVerificationMethodSchema,
  requestAddVerificationMethodDtoSchema,
} from "./validators/RequestAddVerificationMethodSchema.js";
import {
  addVerificationRelationshipSchema,
  requestAddVerificationRelationshipDtoSchema,
} from "./validators/RequestAddVerificationRelationshipSchema.js";
import {
  expireVerificationMethodSchema,
  requestExpireVerificationMethodDtoSchema,
} from "./validators/RequestExpireVerificationMethodSchema.js";
import {
  insertDidDocumentSchema,
  requestInsertDidDocumentDtoSchema,
} from "./validators/RequestInsertDidDocumentSchema.js";
import {
  requestRevokeControllerDtoSchema,
  revokeControllerSchema,
} from "./validators/RequestRevokeControllerSchema.js";
import {
  requestRevokeServiceDtoSchema,
  revokeServiceSchema,
} from "./validators/RequestRevokeServiceSchema.js";
import {
  requestRevokeVerificationMethodDtoSchema,
  revokeVerificationMethodSchema,
} from "./validators/RequestRevokeVerificationMethodSchema.js";
import {
  requestRollVerificationMethodDtoSchema,
  rollVerificationMethodSchema,
} from "./validators/RequestRollVerificationMethodSchema.js";
import {
  requestSendSignedTransactionDtoSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
} from "./validators/RequestSendSignedTransactionSchema.js";
import {
  requestUpdateBaseDocumentDtoSchema,
  updateBaseDocumentSchema,
} from "./validators/RequestUpdateBaseDocumentSchema.js";

function assertDidMatchesSub(did: string, sub: string) {
  if (did !== sub) {
    throw new Error("Access token sub doesn't match the DID from the payload");
  }
}

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

@Injectable()
export class JsonRpcService {
  private chainId?: string;

  private readonly contractAddress: string;

  private readonly logger = new Logger(JsonRpcService.name);

  constructor(private ledgerService: LedgerService) {
    this.contractAddress = ledgerService.getContractAddress();
  }

  async buildTransaction(
    from: string,
    params: string,
  ): Promise<UnsignedTransaction> {
    try {
      const nonceInt = await this.ledgerService
        .getContract()
        .provider.getTransactionCount(from);

      const unsignedTransaction: UnsignedTransaction = {
        chainId: await this.getChainId(),
        data: params,
        from,
        gasLimit: "0x1000000",
        gasPrice: "0x0",
        nonce: ethers.BigNumber.from(nonceInt).toHexString(),
        to: this.contractAddress,
        value: "0x0",
      };

      let gasEstimation: ethers.BigNumber | string = "unset";

      try {
        gasEstimation = await this.estimateGas(unsignedTransaction);
        // Multiply by 1.4
        unsignedTransaction.gasLimit = gasEstimation
          .mul(14)
          .div(10)
          .toHexString();
      } catch {
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

  async buildTransactionAddController(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addController");

      const parsedBody = await requestAddControllerDtoSchema.parseAsync(body);

      const { controller, did, from } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("addController", [did, controller]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddService(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ) {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      const parsedBody = await requestAddServiceDtoSchema.parseAsync(body);

      const { did, from, service } = parsedBody.params[0]!;

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

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("updateBaseDocument", [
          did,
          stringify(baseDocument),
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddVerificationMethod(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addVerificationMethod");

      const parsedBody =
        await requestAddVerificationMethodDtoSchema.parseAsync(body);

      const { did, from, isSecp256k1, publicKey, vMethodId } =
        parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("addVerificationMethod", [
          did,
          vMethodId,
          publicKey,
          isSecp256k1,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddVerificationRelationship(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
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

      const { did, from, name, notAfter, notBefore, vMethodId } =
        parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("addVerificationRelationship", [
          did,
          name,
          vMethodId,
          notBefore,
          notAfter,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionExpireVerificationMethod(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "expireVerificationMethod");

      const parsedBody =
        await requestExpireVerificationMethodDtoSchema.parseAsync(body);

      const { did, from, notAfter, vMethodId } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("expireVerificationMethod", [
          did,
          vMethodId,
          notAfter,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertDidDocument(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
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
        baseDocument,
        did,
        from,
        isSecp256k1,
        notAfter,
        notBefore,
        publicKey,
        vMethodId,
      } = parsedBody.params[0]!;

      if (scope.includes(DIDR_INVITE_SCOPE)) {
        // Verify that the Access Token sub and the payload DID match
        assertDidMatchesSub(did, sub);
      }

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("insertDidDocument", [
          did,
          baseDocument,
          vMethodId,
          publicKey,
          isSecp256k1,
          notBefore,
          notAfter,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeController(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeController");

      const parsedBody =
        await requestRevokeControllerDtoSchema.parseAsync(body);

      const { controller, did, from } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("revokeController", [did, controller]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeService(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ) {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      const parsedBody = await requestRevokeServiceDtoSchema.parseAsync(body);

      const { did, from, serviceId } = parsedBody.params[0]!;

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

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("updateBaseDocument", [
          did,
          stringify(baseDocument),
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeVerificationMethod(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeVerificationMethod");

      const parsedBody =
        await requestRevokeVerificationMethodDtoSchema.parseAsync(body);

      const { did, from, notAfter, vMethodId } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("revokeVerificationMethod", [
          did,
          vMethodId,
          notAfter,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionRollVerificationMethod(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "rollVerificationMethod");

      const parsedBody =
        await requestRollVerificationMethodDtoSchema.parseAsync(body);

      const { args, from } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("rollVerificationMethod", [args]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateBaseDocument(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      const parsedBody =
        await requestUpdateBaseDocumentDtoSchema.parseAsync(body);

      const { baseDocument, did, from } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("updateBaseDocument", [
          did,
          baseDocument,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async estimateGas(
    transaction: UnsignedTransaction,
  ): Promise<ethers.BigNumber> {
    const { data, from, to, value } = transaction;

    try {
      return await this.ledgerService.getContract().provider.estimateGas({
        data,
        from,
        to,
        value,
      });
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      try {
        const { chainId } = await this.ledgerService
          .getContract()
          .provider.getNetwork();
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

  async getDidDocument(did: string): ReturnType<DidRegistry["getDidDocument"]> {
    const contract = this.ledgerService.getContract();
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

  async sendTransaction(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<string> {
    try {
      const parsedBody =
        await requestSendSignedTransactionDtoSchema.parseAsync(body);

      const request = parsedBody.params[0]!;

      await this.verifyTransaction(sub, request, scope);

      const tx = await this.ledgerService
        .getContract()
        .provider.sendTransaction(request.signedRawTransaction);

      return tx.hash;
    } catch (error_) {
      if (isEthersError(error_)) {
        this.logger.error(error_, error_.stack); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(error_.reason, id); // throw simplified ethers error to the user
      }

      if (error_ instanceof Error) {
        if (isAxiosError(error_)) {
          logAxiosError(error_, this.logger);
        } else {
          this.logger.error(error_.message, error_.stack);
        }

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
  }

  async verifyTransaction(
    clientId: string,
    param: SendSignedTransactionParamsSchema,
    scope: string,
  ): Promise<{ functionName: string; signer: string }> {
    const { r, s, signedRawTransaction, unsignedTransaction, v } = param;

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
    const { args, functionFragment } = this.ledgerService
      .getContract()
      .interface.parseTransaction(unsignedTransaction);

    // Extract named args from args (args is a mixed array with named and unnamed values)
    const argsObject = {
      ...extractNamedAttributes(args),
      from: unsignedTransaction.from,
    };

    switch (functionFragment.name) {
      case "addController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await addControllerSchema.parseAsync(argsObject);
        break;
      }
      case "addService": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await addServiceSchema.parseAsync(argsObject);
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
      case "expireVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await expireVerificationMethodSchema.parseAsync(argsObject);
        break;
      }
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
      case "revokeController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await revokeControllerSchema.parseAsync(argsObject);
        break;
      }
      case "revokeService": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await revokeServiceSchema.parseAsync(argsObject);
        break;
      }
      case "revokeVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await revokeVerificationMethodSchema.parseAsync(argsObject);
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
      case "updateBaseDocument": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        await updateBaseDocumentSchema.parseAsync(argsObject);
        break;
      }
      default: {
        throw new Error(
          `The function name ${functionFragment.name} can not be used in this context`,
        );
      }
    }

    return {
      functionName: functionFragment.name,
      signer,
    };
  }
}

export default { JsonRpcService };
