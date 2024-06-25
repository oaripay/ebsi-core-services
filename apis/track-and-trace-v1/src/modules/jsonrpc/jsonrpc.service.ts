import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  InvalidRequestJsonRpcError,
  isEthersError,
  getErrorMessage,
  extractNamedAttributes,
  logAxiosError,
} from "@ebsiint-api/shared";
import axios from "axios";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";
import {
  TNT_AUTHORISE_SCOPE,
  TNT_CREATE_SCOPE,
  TNT_WRITE_SCOPE,
} from "../auth/auth.constants.js";
import { hexToDid } from "../../shared/utils.js";
import {
  authoriseDidSchema,
  createDocumentSchema,
  removeDocumentSchema,
  grantAccessSchema,
  revokeAccessSchema,
  writeEventSchema,
  requestAuthoriseDidDtoSchema,
  requestCreateDocumentDtoSchema,
  requestRemoveDocumentDtoSchema,
  requestGrantAccessDtoSchema,
  requestWriteEventDtoSchema,
  requestRevokeAccessDtoSchema,
  requestSendSignedTransactionDtoSchema,
  type JsonRpcSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
} from "./validators/index.js";

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
      case "authoriseDid": {
        assertScopeContains(
          scope,
          [TNT_AUTHORISE_SCOPE],
          functionFragment.name,
        );
        const castArgs = await authoriseDidSchema.parseAsync(argsObject);
        assertDidMatchesSub(castArgs.senderDid, clientId);
        break;
      }
      case "createDocument": {
        assertScopeContains(scope, [TNT_CREATE_SCOPE], functionFragment.name);
        const castArgs = await createDocumentSchema.parseAsync(argsObject);
        assertDidMatchesSub(castArgs.didEbsiCreator, clientId);
        break;
      }
      case "removeDocument": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], functionFragment.name);

        await removeDocumentSchema.parseAsync(argsObject);
        break;
      }
      case "grantAccess": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], functionFragment.name);
        const castArgs = await grantAccessSchema.parseAsync(argsObject);
        const did = hexToDid(castArgs.grantedByAccount);
        assertDidMatchesSub(did, clientId);
        break;
      }
      case "revokeAccess": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], functionFragment.name);

        const castArgs = await revokeAccessSchema.parseAsync(argsObject);
        const did = hexToDid(castArgs.revokedByAccount);
        assertDidMatchesSub(did, clientId);
        break;
      }
      case "writeEvent": {
        assertScopeContains(scope, [TNT_WRITE_SCOPE], functionFragment.name);

        if ("eventParams" in argsObject) {
          argsObject.eventParams = extractNamedAttributes(
            argsObject.eventParams,
          );
        }

        const castArgs = await writeEventSchema.parseAsync(argsObject);
        const did = hexToDid(castArgs.eventParams.sender);
        assertDidMatchesSub(did, clientId);
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

  async buildTransactionAuthoriseDid(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_AUTHORISE_SCOPE], "authoriseDid");

      const parsedBody = await requestAuthoriseDidDtoSchema.parseAsync(body);

      const { from, senderDid, authorisedDid, whiteList } =
        parsedBody.params[0]!;

      // Verify that the Access Token sub and the senderDid match
      assertDidMatchesSub(senderDid, sub);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("authoriseDid", [
        senderDid,
        authorisedDid,
        whiteList,
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

  async buildTransactionCreateDocument(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_CREATE_SCOPE], "createDocument");

      const parsedBody = await requestCreateDocumentDtoSchema.parseAsync(body);

      const {
        from,
        documentHash,
        documentMetadata,
        didEbsiCreator,
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

      const data = (await this.ledgerService.getContract()).interface // @ts-expect-error No overload matches this call
        .encodeFunctionData(functionSig, args);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionRemoveDocument(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    _: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "removeDocument");

      const parsedBody = await requestRemoveDocumentDtoSchema.parseAsync(body);

      const { from, documentHash } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("removeDocument", [documentHash]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionGrantAccess(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "grantAccess");

      const parsedBody = await requestGrantAccessDtoSchema.parseAsync(body);

      const {
        from,
        documentHash,
        grantedByAccount,
        subjectAccount,
        grantedByAccType,
        subjectAccType,
        permission,
      } = parsedBody.params[0]!;

      // Verify that the Access Token sub and grantedByAccount match
      const grantedByAccountDid = hexToDid(grantedByAccount);
      assertDidMatchesSub(grantedByAccountDid, sub);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("grantAccess", [
        documentHash,
        grantedByAccount,
        subjectAccount,
        grantedByAccType,
        subjectAccType,
        permission,
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

  async buildTransactionRevokeAccess(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "grantAccess");

      const parsedBody = await requestRevokeAccessDtoSchema.parseAsync(body);

      const {
        from,
        documentHash,
        revokedByAccount,
        subjectAccount,
        permission,
      } = parsedBody.params[0]!;

      // Verify that the Access Token sub and revokedByAccount match
      const revokedByAccountDid = hexToDid(revokedByAccount);
      assertDidMatchesSub(revokedByAccountDid, sub);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeAccess", [
        documentHash,
        revokedByAccount,
        subjectAccount,
        permission,
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

  async buildTransactionWriteEvent(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    try {
      assertScopeContains(scope, [TNT_WRITE_SCOPE], "writeEvent");

      const parsedBody = await requestWriteEventDtoSchema.parseAsync(body);

      const { from, eventParams, timestamp, timestampProof } =
        parsedBody.params[0]!;

      const did = hexToDid(eventParams.sender);
      assertDidMatchesSub(did, sub);

      let data: string;
      if (timestamp && timestampProof !== undefined) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData(
          "writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)",
          [eventParams, timestamp, timestampProof],
        );
      } else {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData(
          "writeEvent((bytes32,string,bytes,string,string))",
          [eventParams],
        );
      }

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
