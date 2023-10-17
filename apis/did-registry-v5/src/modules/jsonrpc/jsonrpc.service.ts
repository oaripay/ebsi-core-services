import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  InvalidRequestJsonRpcError,
  isEthersError,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { DidRegistry } from "@ebsiint-sc/did-registry-v3";
import {
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  SignedTransactionParam,
  RequestInsertDidDocumentDto,
  ArgsInsertDidDocument,
  RequestUpdateBaseDocumentDto,
  ArgsUpdateBaseDocument,
  RequestAddControllerDto,
  ArgsAddController,
  RequestRevokeControllerDto,
  ArgsRevokeController,
  RequestAddVerificationMethodDto,
  ArgsAddVerificationMethod,
  RequestAddVerificationRelationshipDto,
  ArgsAddVerificationRelationship,
  RequestRevokeVerificationMethodDto,
  ArgsRevokeVerificationMethod,
  RequestExpireVerificationMethodDto,
  ArgsExpireVerificationMethod,
  RequestRollVerificationMethodDto,
  ArgsRollVerificationMethod,
  RequestAddServiceDto,
  RequestRevokeServiceDto,
} from "./dto/index.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE } from "../auth/auth.constants.js";

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
          this.logger.error(error);
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
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.estimateGas({
        from,
        to,
        data,
        value,
      });
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async verifyTransaction(
    clientId: string,
    param: SignedTransactionParam,
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

    switch (functionFragment.name) {
      case "insertDidDocument": {
        assertScopeContains(
          scope,
          [DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE],
          functionFragment.name,
        );
        const castArgs = args as unknown as ArgsInsertDidDocument;
        await validateClass(ArgsInsertDidDocument, castArgs);
        if (scope.includes(DIDR_INVITE_SCOPE)) {
          assertDidMatchesSub(castArgs.did, clientId);
        }
        break;
      }
      case "updateBaseDocument": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsUpdateBaseDocument;
        await validateClass(ArgsUpdateBaseDocument, castArgs);
        break;
      }
      case "addController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsAddController;
        await validateClass(ArgsAddController, castArgs);
        break;
      }
      case "revokeController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsRevokeController;
        await validateClass(ArgsRevokeController, castArgs);
        break;
      }
      case "addVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsAddVerificationMethod;
        await validateClass(ArgsAddVerificationMethod, castArgs);
        break;
      }
      case "addVerificationRelationship": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsAddVerificationRelationship;
        await validateClass(ArgsAddVerificationRelationship, castArgs);
        break;
      }
      case "revokeVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsRevokeVerificationMethod;
        await validateClass(ArgsRevokeVerificationMethod, castArgs);
        break;
      }
      case "expireVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsExpireVerificationMethod;
        await validateClass(ArgsExpireVerificationMethod, castArgs);
        break;
      }
      case "rollVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsRollVerificationMethod;
        await validateClass(ArgsRollVerificationMethod, castArgs);
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
        this.logger.error(error);
      }
      throw new Error("Could not build transaction.");
    }
  }

  async buildTransactionInsertDidDocument(
    body: RequestInsertDidDocumentDto,
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

      await validateClass(RequestInsertDidDocumentDto, body);

      const {
        from,
        did,
        baseDocument,
        vMethodId,
        publicKey,
        isSecp256k1,
        notBefore,
        notAfter,
      } = body.params[0]!;

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
        this.logger.error(error);
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
    body: RequestAddServiceDto,
    id: number | string | null | undefined,
    scope: string,
  ) {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      await validateClass(RequestAddServiceDto, body);

      const { from, did, service } = body.params[0]!;
      const didDocument = await this.getDidDocument(did);

      let baseDocument: { [x: string]: unknown; service?: unknown[] };
      try {
        baseDocument = JSON.parse(didDocument.baseDocument) as {
          [x: string]: unknown;
        };
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
    body: RequestRevokeServiceDto,
    id: number | string | null | undefined,
    scope: string,
  ) {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      await validateClass(RequestRevokeServiceDto, body);

      const { from, did, serviceId } = body.params[0]!;

      const didDocument = await this.getDidDocument(did);

      let baseDocument: { [x: string]: unknown; service?: { id: string }[] };
      try {
        baseDocument = JSON.parse(didDocument.baseDocument) as {
          [x: string]: unknown;
        };
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
    body: RequestUpdateBaseDocumentDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      await validateClass(RequestUpdateBaseDocumentDto, body);

      const { from, did, baseDocument } = body.params[0]!;

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
    body: RequestAddControllerDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addController");

      await validateClass(RequestAddControllerDto, body);

      const { from, did, controller } = body.params[0]!;

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
    body: RequestRevokeControllerDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeController");

      await validateClass(RequestRevokeControllerDto, body);

      const { from, did, controller } = body.params[0]!;

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
    body: RequestAddVerificationMethodDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addVerificationMethod");

      await validateClass(RequestAddVerificationMethodDto, body);

      const { from, did, vMethodId, publicKey, isSecp256k1 } = body.params[0]!;

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
    body: RequestAddVerificationRelationshipDto,
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

      await validateClass(RequestAddVerificationRelationshipDto, body);

      const { from, did, name, vMethodId, notBefore, notAfter } =
        body.params[0]!;

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
    body: RequestRevokeVerificationMethodDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeVerificationMethod");

      await validateClass(RequestRevokeVerificationMethodDto, body);

      const { from, did, vMethodId, notAfter } = body.params[0]!;

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
    body: RequestExpireVerificationMethodDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "expireVerificationMethod");

      await validateClass(RequestExpireVerificationMethodDto, body);

      const { from, did, vMethodId, notAfter } = body.params[0]!;

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
    body: RequestRollVerificationMethodDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "rollVerificationMethod");

      await validateClass(RequestRollVerificationMethodDto, body);

      const { from, rollArgs } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("rollVerificationMethod", [rollArgs]);

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
    body: RequestSendSignedTransactionDto,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0]!;

      await this.verifyTransaction(sub, request, scope);

      const tx = await (
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);

      return tx.hash;
    } catch (err) {
      if (isEthersError(err)) {
        this.logger.error(err); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(err.reason, id); // throw simplified ethers error to the user
      }
      if (err instanceof Error) {
        const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);

        if (err instanceof Error && err.stack) {
          error.stack = err.stack;
        }

        throw error;
      }
      throw err;
    }
  }
}

export default { JsonRpcService };
