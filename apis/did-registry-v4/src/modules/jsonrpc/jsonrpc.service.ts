import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import { DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE } from "../auth/auth.constants.js";
import { LedgerService } from "../ledger/ledger.service.js";
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
} from "./dto/index.js";
import {
  formatEthersSignature,
  formatEthersUnsignedTransaction,
  validateClass,
} from "./jsonrpc.utils.js";

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
    body: RequestAddControllerDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "addController");

      await validateClass(RequestAddControllerDto, body);

      const { controller, did, from } = body.params[0]!;

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
    body: RequestExpireVerificationMethodDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "expireVerificationMethod");

      await validateClass(RequestExpireVerificationMethodDto, body);

      const { did, from, notAfter, vMethodId } = body.params[0]!;

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
    body: RequestRevokeControllerDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      // Access Token must contain DIDR_WRITE_SCOPE scope
      assertScopeContains(scope, DIDR_WRITE_SCOPE, "revokeController");

      await validateClass(RequestRevokeControllerDto, body);

      const { controller, did, from } = body.params[0]!;

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

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("rollVerificationMethod", [
          did,
          vMethodId,
          publicKey,
          isSecp256k1,
          notBefore,
          notAfter,
          oldVMethodId,
          duration,
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

  async sendTransaction(
    body: RequestSendSignedTransactionDto,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0]!;

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
    const contract = this.ledgerService.getContractV1();
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

    switch (functionFragment.name) {
      case "addController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsAddController;
        await validateClass(ArgsAddController, castArgs);
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
      case "expireVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsExpireVerificationMethod;
        await validateClass(ArgsExpireVerificationMethod, castArgs);
        break;
      }
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
        await this.validateControllerOnV3(castArgs.did, signer);
        break;
      }
      case "revokeController": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsRevokeController;
        await validateClass(ArgsRevokeController, castArgs);
        break;
      }
      case "revokeVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsRevokeVerificationMethod;
        await validateClass(ArgsRevokeVerificationMethod, castArgs);
        break;
      }
      case "rollVerificationMethod": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsRollVerificationMethod;
        await validateClass(ArgsRollVerificationMethod, castArgs);
        break;
      }
      case "updateBaseDocument": {
        assertScopeContains(scope, DIDR_WRITE_SCOPE, functionFragment.name);
        const castArgs = args as unknown as ArgsUpdateBaseDocument;
        await validateClass(ArgsUpdateBaseDocument, castArgs);
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
