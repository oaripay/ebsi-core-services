import { getResolver } from "@cef-ebsi/ebsi-did-resolver";
import {
  decodeResult,
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  logAxiosError,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isAxiosError } from "axios";
import { Resolver } from "did-resolver";
import { ethers } from "ethers";

import type { ApiConfig } from "../../config/configuration.js";

import { hexToDid } from "../../shared/utils.js";
import {
  TNT_AUTHORISE_SCOPE,
  TNT_CREATE_SCOPE,
  TNT_WRITE_SCOPE,
} from "../auth/auth.constants.js";
import { LedgerService } from "../ledger/ledger.service.js";
import {
  formatEthersSignature,
  formatEthersUnsignedTransaction,
} from "./jsonrpc.utils.js";
import {
  authoriseDidSchemaBuilder,
  createDocumentSchema,
  grantAccessSchema,
  type JsonRpcSchema,
  removeDocumentSchema,
  requestAuthoriseDidDtoSchemaBuilder,
  requestCreateDocumentDtoSchema,
  requestGrantAccessDtoSchema,
  requestRemoveDocumentDtoSchema,
  requestRevokeAccessDtoSchema,
  requestSendSignedTransactionDtoSchema,
  requestWriteEventDtoSchema,
  revokeAccessSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
  writeEventSchema,
} from "./validators/index.js";

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
  private readonly authoriseDidSchema: ReturnType<
    typeof authoriseDidSchemaBuilder
  >;

  private chainId?: string;

  private readonly contractAddress: string;

  private readonly logger = new Logger(JsonRpcService.name);

  private readonly requestAuthoriseDidDtoSchema: ReturnType<
    typeof requestAuthoriseDidDtoSchemaBuilder
  >;

  constructor(
    private ledgerService: LedgerService,
    configService: ConfigService<ApiConfig, true>,
  ) {
    this.contractAddress = ledgerService.getContractAddress();
    const resolverConfig = {
      registry: `${configService.get("didRegistryApiUrl", { infer: true })}/identifiers`,
    };
    const ebsiResolver = getResolver(resolverConfig);
    const didResolver = new Resolver(ebsiResolver);
    this.authoriseDidSchema = authoriseDidSchemaBuilder(didResolver);
    this.requestAuthoriseDidDtoSchema =
      requestAuthoriseDidDtoSchemaBuilder(didResolver);
  }

  async buildTransaction(
    from: string,
    params: string,
  ): Promise<UnsignedTransaction> {
    try {
      const nonceInt = await this.ledgerService
        .getEthersProvider()
        .getTransactionCount(from);

      const unsignedTransaction = {
        chainId: await this.getChainId(),
        data: params,
        from,
        gasLimit: "0x1000000",
        gasPrice: "0x0",
        nonce: `0x${BigInt(nonceInt).toString(16)}`,
        to: this.contractAddress,
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

  async buildTransactionAuthoriseDid(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_AUTHORISE_SCOPE], "authoriseDid");

      const parsedBody =
        await this.requestAuthoriseDidDtoSchema.parseAsync(body);

      const { authorisedDid, from, senderDid, whiteList } =
        parsedBody.params[0]!;

      // Verify that the Access Token sub and the senderDid match
      assertDidMatchesSub(senderDid, sub);

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("authoriseDid", [
          senderDid,
          authorisedDid,
          whiteList,
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

  async buildTransactionCreateDocument(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_CREATE_SCOPE], "createDocument");

      const parsedBody = await requestCreateDocumentDtoSchema.parseAsync(body);

      const {
        didEbsiCreator,
        documentHash,
        documentMetadata,
        from,
        timestamp,
        timestampProof,
      } = parsedBody.params[0]!;

      // Verify that the Access Token sub and the payload DID match
      assertDidMatchesSub(didEbsiCreator, sub);

      const functionSig = timestamp
        ? "createDocument(bytes32,string,string,uint256,bytes32)"
        : "createDocument(bytes32,string,string)";

      const args = timestamp
        ? [
            documentHash,
            documentMetadata,
            didEbsiCreator,
            timestamp,
            timestampProof,
          ]
        : [documentHash, documentMetadata, didEbsiCreator];

      const data = this.ledgerService
        .getContract()
        .interface // @ts-expect-error No overload matches this call
        .encodeFunctionData(functionSig, args);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionGrantAccess(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "grantAccess");

      const parsedBody = await requestGrantAccessDtoSchema.parseAsync(body);

      const {
        documentHash,
        from,
        grantedByAccount,
        grantedByAccType,
        permission,
        subjectAccount,
        subjectAccType,
      } = parsedBody.params[0]!;

      // Verify that the Access Token sub and grantedByAccount match
      const grantedByAccountDid = hexToDid(grantedByAccount);
      assertDidMatchesSub(grantedByAccountDid, sub);

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("grantAccess", [
          documentHash,
          grantedByAccount,
          subjectAccount,
          grantedByAccType,
          subjectAccType,
          permission,
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

  async buildTransactionRemoveDocument(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    _: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "removeDocument");

      const parsedBody = await requestRemoveDocumentDtoSchema.parseAsync(body);

      const { documentHash, from } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("removeDocument", [documentHash]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeAccess(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "grantAccess");

      const parsedBody = await requestRevokeAccessDtoSchema.parseAsync(body);

      const {
        documentHash,
        from,
        permission,
        revokedByAccount,
        subjectAccount,
      } = parsedBody.params[0]!;

      // Verify that the Access Token sub and revokedByAccount match
      const revokedByAccountDid = hexToDid(revokedByAccount);
      assertDidMatchesSub(revokedByAccountDid, sub);

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("revokeAccess", [
          documentHash,
          revokedByAccount,
          subjectAccount,
          permission,
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

  async buildTransactionWriteEvent(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "writeEvent");

      const parsedBody = await requestWriteEventDtoSchema.parseAsync(body);

      const { eventParams, from, timestamp, timestampProof } =
        parsedBody.params[0]!;

      const did = hexToDid(eventParams.sender);
      assertDidMatchesSub(did, sub);

      const data =
        timestamp && timestampProof !== undefined
          ? this.ledgerService
              .getContract()
              .interface.encodeFunctionData(
                "writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)",
                [eventParams, timestamp, timestampProof],
              )
          : this.ledgerService
              .getContract()
              .interface.encodeFunctionData(
                "writeEvent((bytes32,string,bytes,string,string))",
                [eventParams],
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

    try {
      return await this.ledgerService.getEthersProvider().estimateGas({
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
          .getEthersProvider()
          .getNetwork();
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
    body: JsonRpcSchema,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<string> {
    try {
      const chainId = await this.getChainId();

      const parsedBody =
        await requestSendSignedTransactionDtoSchema(chainId).parseAsync(body);

      const request = parsedBody.params[0]!;

      await this.verifyTransaction(sub, request, scope);

      const tx = await this.ledgerService
        .getEthersProvider()
        .broadcastTransaction(request.signedRawTransaction);

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

    if (unsignedTransaction.to !== this.contractAddress) {
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`,
      );
    }

    // verify function and parameters encoded in unsignedTransaction.data
    const parsedTransaction = this.ledgerService
      .getContract()
      .interface.parseTransaction(unsignedTransaction);

    if (!parsedTransaction) {
      throw new Error("Invalid unsignedTransaction.data");
    }

    const { args, fragment } = parsedTransaction;

    // Extract named args from args (args is a mixed array with named and unnamed values)
    const argsObject = {
      // @ts-expect-error Error due to CommonJS vs ESM modules imports
      ...decodeResult(args),
      from: unsignedTransaction.from,
    };

    switch (fragment.name) {
      case "authoriseDid": {
        assertScopeContains(scope, [TNT_AUTHORISE_SCOPE], fragment.name);
        const castArgs = await this.authoriseDidSchema.parseAsync(argsObject);
        assertDidMatchesSub(castArgs.senderDid, clientId);
        break;
      }
      case "createDocument": {
        assertScopeContains(scope, [TNT_CREATE_SCOPE], fragment.name);
        const castArgs = await createDocumentSchema.parseAsync(argsObject);
        assertDidMatchesSub(castArgs.didEbsiCreator, clientId);
        break;
      }
      case "grantAccess": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], fragment.name);
        const castArgs = await grantAccessSchema.parseAsync(argsObject);
        const did = hexToDid(castArgs.grantedByAccount);
        assertDidMatchesSub(did, clientId);
        break;
      }
      case "removeDocument": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], fragment.name);

        await removeDocumentSchema.parseAsync(argsObject);
        break;
      }
      case "revokeAccess": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], fragment.name);

        const castArgs = await revokeAccessSchema.parseAsync(argsObject);
        const did = hexToDid(castArgs.revokedByAccount);
        assertDidMatchesSub(did, clientId);
        break;
      }
      case "writeEvent": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], fragment.name);

        const castArgs = await writeEventSchema.parseAsync(argsObject);
        const did = hexToDid(castArgs.eventParams.sender);
        assertDidMatchesSub(did, clientId);
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

export default { JsonRpcService };
