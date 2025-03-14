import type { DidRegistry as DidRegistryV1 } from "@ebsiint-sc/did-registry";
import type { DidRegistry as DidRegistryV2 } from "@ebsiint-sc/did-registry-v2";

import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
} from "@ebsiint-api/shared";
import { DidRegistry__factory as DidRegistryV1__factory } from "@ebsiint-sc/did-registry";
import { DidRegistry__factory as DidRegistryV2__factory } from "@ebsiint-sc/did-registry-v2";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

import type { ApiConfig } from "../../config/configuration.ts";

import { DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE } from "../auth/auth.constants.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import {
  ArgsAddController,
  ArgsAddVerificationMethod,
  ArgsAddVerificationRelationship,
  ArgsExpireVerificationMethod,
  ArgsInsertDidDocument,
  ArgsRevokeController,
  ArgsRevokeVerificationMethod,
  ArgsRollVerificationMethod,
  ArgsUpdateBaseDocument,
  RequestAddControllerDto,
  RequestAddVerificationMethodDto,
  RequestAddVerificationRelationshipDto,
  RequestExpireVerificationMethodDto,
  RequestInsertDidDocumentDto,
  RequestRevokeControllerDto,
  RequestRevokeVerificationMethodDto,
  RequestRollVerificationMethodDto,
  RequestSendSignedTransactionDto,
  RequestUpdateBaseDocumentDto,
  SignedTransactionParam,
  UnsignedTransaction,
} from "./dto/index.ts";
import {
  formatEthersSignature,
  formatEthersUnsignedTransaction,
  validateClass,
} from "./jsonrpc.utils.ts";

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
  private chainId: string | undefined;

  private readonly didRegistryV1Address: string;

  private readonly didRegistryV1Contract: DidRegistryV1;

  private readonly didRegistryV2Address: string;

  private readonly didRegistryV2Contract: DidRegistryV2;

  private readonly logger = new Logger(JsonRpcService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.didRegistryV1Address = configService.get("contractAddrV1", {
      infer: true,
    });
    this.didRegistryV1Contract = DidRegistryV1__factory.connect(
      this.didRegistryV1Address,
    );
    this.didRegistryV2Address = configService.get("contractAddr", {
      infer: true,
    });
    this.didRegistryV2Contract = DidRegistryV2__factory.connect(
      this.didRegistryV2Address,
    );
  }

  async buildTransaction(
    from: string,
    params: string,
  ): Promise<UnsignedTransaction> {
    const provider = this.ledgerService.getProvider();

    try {
      const nonceInt = await provider.getTransactionCount(from);

      const unsignedTransaction = {
        chainId: await this.getChainId(),
        data: params,
        from,
        gasLimit: "0x1000000",
        gasPrice: "0x0",
        nonce: `0x${BigInt(nonceInt).toString(16)}`,
        to: this.didRegistryV2Address,
        value: "0x0",
      } satisfies UnsignedTransaction;

      try {
        const gasEstimation = await this.estimateGas(unsignedTransaction);
        // Multiply by 1.4
        unsignedTransaction.gasLimit = `0x${(
          (gasEstimation * 14n) /
          10n
        ).toString(16)}`;
      } catch {
        this.logger.warn("Gas could not be estimated. Using 0x1000000");
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
    body: RequestAddControllerDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addController");

      await validateClass(RequestAddControllerDto, body);

      const { controller, did, from } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "addController",
        [did, controller],
      );

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
    body: RequestAddVerificationMethodDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addVerificationMethod");

      await validateClass(RequestAddVerificationMethodDto, body);

      const { did, from, isSecp256k1, publicKey, vMethodId } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "addVerificationMethod",
        [did, vMethodId, publicKey, isSecp256k1],
      );

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
    body: RequestAddVerificationRelationshipDto,
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

      await validateClass(RequestAddVerificationRelationshipDto, body);

      const { did, from, name, notAfter, notBefore, vMethodId } =
        body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "addVerificationRelationship",
        [did, name, vMethodId, notBefore, notAfter],
      );

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
    body: RequestExpireVerificationMethodDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "expireVerificationMethod");

      await validateClass(RequestExpireVerificationMethodDto, body);

      const { did, from, notAfter, vMethodId } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "expireVerificationMethod",
        [did, vMethodId, notAfter],
      );

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
    body: RequestInsertDidDocumentDto,
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

      await validateClass(RequestInsertDidDocumentDto, body);

      const {
        baseDocument,
        did,
        from,
        isSecp256k1,
        notAfter,
        notBefore,
        publicKey,
        vMethodId,
      } = body.params[0]!;

      if (scope.includes(DIDR_INVITE_SCOPE)) {
        // Verify that the Access Token sub and the payload DID match
        assertDidMatchesSub(did, sub);
      }

      await this.validateControllerOnV3(did, from);

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "insertDidDocument",
        [
          did,
          baseDocument,
          vMethodId,
          publicKey,
          isSecp256k1,
          notBefore,
          notAfter,
        ],
      );

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
    body: RequestRevokeControllerDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeController");

      await validateClass(RequestRevokeControllerDto, body);

      const { controller, did, from } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "revokeController",
        [did, controller],
      );

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
    body: RequestRevokeVerificationMethodDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeVerificationMethod");

      await validateClass(RequestRevokeVerificationMethodDto, body);

      const { did, from, notAfter, vMethodId } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "revokeVerificationMethod",
        [did, vMethodId, notAfter],
      );

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
    body: RequestRollVerificationMethodDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "rollVerificationMethod");

      await validateClass(RequestRollVerificationMethodDto, body);

      const {
        did,
        duration,
        from,
        isSecp256k1,
        notAfter,
        notBefore,
        oldVMethodId,
        publicKey,
        vMethodId,
      } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "rollVerificationMethod",
        [
          did,
          vMethodId,
          publicKey,
          isSecp256k1,
          notBefore,
          notAfter,
          oldVMethodId,
          duration,
        ],
      );

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
    body: RequestUpdateBaseDocumentDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "updateBaseDocument");

      await validateClass(RequestUpdateBaseDocumentDto, body);

      const { baseDocument, did, from } = body.params[0]!;

      const data = this.didRegistryV2Contract.interface.encodeFunctionData(
        "updateBaseDocument",
        [did, baseDocument],
      );

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async estimateGas(transaction: UnsignedTransaction): Promise<bigint> {
    const { data, from, to, value } = transaction;

    const provider = this.ledgerService.getProvider();

    try {
      return await provider.estimateGas({
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
      const provider = this.ledgerService.getProvider();

      try {
        const { chainId } = await provider.getNetwork();
        this.chainId = `0x${BigInt(chainId).toString(16)}`;
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new Error(getErrorMessage(error));
      }
    }

    return this.chainId;
  }

  async sendTransaction(
    body: RequestSendSignedTransactionDto,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<string> {
    const provider = this.ledgerService.getProvider();

    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0]!;

      await this.verifyTransaction(sub, request, scope);

      const tx = await provider.broadcastTransaction(
        request.signedRawTransaction,
      );

      return tx.hash;
    } catch (error_) {
      if (isEthersError(error_)) {
        this.logger.error(error_, error_.stack); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(
          error_.error?.message ?? error_.shortMessage,
          id,
          undefined,
          error_.error &&
          "code" in error_.error &&
          typeof error_.error.code === "number"
            ? error_.error.code
            : undefined,
        );
      }
      if (error_ instanceof Error) {
        const error = new InvalidRequestJsonRpcError(
          getErrorMessage(error_),
          id,
        );
        if (error_ instanceof Error && error_.stack) {
          error.stack = error_.stack;
        }
        throw error;
      }
      throw error_;
    }
  }

  /**
   * If the DID exists on DID Registry V3 then its controller
   * must be the signer of the transaction to insert it in
   * DID Registry V4
   */
  async validateControllerOnV3(did: string, controller: string): Promise<void> {
    const provider = this.ledgerService.getProvider();
    const contract = this.didRegistryV1Contract
      // @ts-expect-error Error due to contracts using CommonJS modules
      .connect(provider);
    const didHex = `0x${Buffer.from(did).toString("hex")}`;
    try {
      await contract.getLatestDidDocumentVersion(didHex);
    } catch {
      // the did doesn't exist on DID Registry V3
      return;
    }

    if (!(await contract.checkController(didHex, controller))) {
      throw new Error(
        `The address ${controller} is not the controller of ${did} in DID Registry V3`,
      );
    }
  }

  async verifyTransaction(
    clientId: string,
    param: SignedTransactionParam,
    scope: string,
  ): Promise<{ functionName: string; signer: string }> {
    const { r, s, signedRawTransaction, unsignedTransaction, v } = param;

    const unsignedTx = formatEthersUnsignedTransaction(unsignedTransaction);
    const signature = formatEthersSignature(r, s, v);

    // Serialize transaction with and without signature
    const unsignedSerializedTransaction =
      ethers.Transaction.from(unsignedTx).unsignedSerialized;
    const signedSerializedTransaction = ethers.Transaction.from({
      ...unsignedTx,
      signature,
    }).serialized;

    if (signedSerializedTransaction !== signedRawTransaction) {
      throw new Error(
        `The unsigned transaction + signature (${signedSerializedTransaction}) does not match with the signedRawTransaction (${signedRawTransaction})`,
      );
    }

    // recover address used to sign
    const digest = ethers.keccak256(unsignedSerializedTransaction);
    const signer = ethers.recoverAddress(digest, signature);

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

    if (unsignedTransaction.to !== this.didRegistryV2Address) {
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.didRegistryV2Address}. Received ${unsignedTransaction.to}`,
      );
    }

    // verify function and parameters encoded in unsignedTransaction.data
    const parsedTransaction =
      this.didRegistryV2Contract.interface.parseTransaction(
        unsignedTransaction,
      );

    if (!parsedTransaction) {
      throw new Error("Invalid unsignedTransaction.data");
    }

    const { args, fragment } = parsedTransaction;

    switch (fragment.name) {
      case "addController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsAddController;
        await validateClass(ArgsAddController, castArgs);
        break;
      }
      case "addVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsAddVerificationMethod;
        await validateClass(ArgsAddVerificationMethod, castArgs);
        break;
      }
      case "addVerificationRelationship": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsAddVerificationRelationship;
        await validateClass(ArgsAddVerificationRelationship, castArgs);
        break;
      }
      case "expireVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsExpireVerificationMethod;
        await validateClass(ArgsExpireVerificationMethod, castArgs);
        break;
      }
      case "insertDidDocument": {
        assertScopeContains(
          scope,
          [DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE],
          fragment.name,
        );
        const castArgs = args as unknown as ArgsInsertDidDocument;
        await validateClass(ArgsInsertDidDocument, castArgs);
        if (scope.includes(DIDR_INVITE_SCOPE)) {
          assertDidMatchesSub(castArgs.did, clientId);
        }
        await this.validateControllerOnV3(castArgs.did, signer);
        break;
      }
      case "revokeController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsRevokeController;
        await validateClass(ArgsRevokeController, castArgs);
        break;
      }
      case "revokeVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsRevokeVerificationMethod;
        await validateClass(ArgsRevokeVerificationMethod, castArgs);
        break;
      }
      case "rollVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsRollVerificationMethod;
        await validateClass(ArgsRollVerificationMethod, castArgs);
        break;
      }
      case "updateBaseDocument": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, fragment.name);
        const castArgs = args as unknown as ArgsUpdateBaseDocument;
        await validateClass(ArgsUpdateBaseDocument, castArgs);
        break;
      }
      default: {
        throw new Error(
          `The function name ${fragment.name} can not be used in this context`,
        );
      }
    }

    return {
      functionName: fragment.name,
      signer,
    };
  }
}
