import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { ProblemDetailsError } from "@ebsiint-api/shared";
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
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { LedgerService } from "../ledger/ledger.service";

function getErrorMessage(error: unknown) {
  if (error instanceof ProblemDetailsError && error.detail) {
    return error.detail;
  }
  return (error as Error).message;
}

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId: string = null;

  private contractAddress: string;

  constructor(private ledgerService: LedgerService) {
    this.contractAddress = ledgerService.getContractAddress();
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      const { chainId } = await (
        await this.ledgerService.getContract()
      ).provider.getNetwork();
      this.chainId = ethers.BigNumber.from(chainId).toHexString();
    }
    return this.chainId;
  }

  async estimateGas(
    transaction: UnsignedTransaction
  ): Promise<ethers.BigNumber> {
    const { from, to, data, value } = transaction;

    return (
      await this.ledgerService.getContract({ protectedMethod: true })
    ).provider.estimateGas({
      from,
      to,
      data,
      value,
    });
  }

  async verifyTransaction(
    clientId: string,
    param: SignedTransactionParam
  ): Promise<{ signer: string; functionName: string }> {
    const { unsignedTransaction, r, s, v, signedRawTransaction } = param;

    const unsignedTx = formatEthersUnsignedTransaction(unsignedTransaction);
    const signature = formatEthersSignature(r, s, v);

    // Serialize transaction with and without signature
    const serializedTransaction = ethers.utils.serializeTransaction(unsignedTx);
    const serializedTransactionSigned = ethers.utils.serializeTransaction(
      unsignedTx,
      signature
    );

    if (serializedTransactionSigned !== signedRawTransaction) {
      throw new Error(
        `The unsigned transaction + signature (${serializedTransactionSigned}) does not match with the signedRawTransaction (${signedRawTransaction})`
      );
    }

    // recover address used to sign
    const digest = ethers.utils.keccak256(serializedTransaction);
    const signer = ethers.utils.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase()) {
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `
      );
    }

    const chainId = await this.getChainId();
    if (unsignedTransaction.chainId !== chainId) {
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`
      );
    }

    if (unsignedTransaction.to !== this.contractAddress) {
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`
      );
    }

    // verify function and parameters encoded in unsignedTransaction.data
    const { args, functionFragment } = (
      await this.ledgerService.getContract()
    ).interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertDidDocument": {
        const castArgs = args as unknown as ArgsInsertDidDocument;
        await validateClass(ArgsInsertDidDocument, castArgs);
        break;
      }

      case "updateBaseDocument": {
        const castArgs = args as unknown as ArgsUpdateBaseDocument;
        await validateClass(ArgsUpdateBaseDocument, castArgs);
        break;
      }

      case "addController": {
        const castArgs = args as unknown as ArgsAddController;
        await validateClass(ArgsAddController, castArgs);
        break;
      }

      case "revokeController": {
        const castArgs = args as unknown as ArgsRevokeController;
        await validateClass(ArgsRevokeController, castArgs);
        break;
      }

      case "addVerificationMethod": {
        const castArgs = args as unknown as ArgsAddVerificationMethod;
        await validateClass(ArgsAddVerificationMethod, castArgs);
        break;
      }

      case "addVerificationRelationship": {
        const castArgs = args as unknown as ArgsAddVerificationRelationship;
        await validateClass(ArgsAddVerificationRelationship, castArgs);
        break;
      }

      case "revokeVerificationMethod": {
        const castArgs = args as unknown as ArgsRevokeVerificationMethod;
        await validateClass(ArgsRevokeVerificationMethod, castArgs);
        break;
      }

      case "expireVerificationMethod": {
        const castArgs = args as unknown as ArgsExpireVerificationMethod;
        await validateClass(ArgsExpireVerificationMethod, castArgs);
        break;
      }

      case "rollVerificationMethod": {
        const castArgs = args as unknown as ArgsRollVerificationMethod;
        await validateClass(ArgsRollVerificationMethod, castArgs);
        break;
      }

      default:
        throw new Error(
          `The function name ${functionFragment.name} can not be used in this context`
        );
    }

    return {
      signer,
      functionName: functionFragment.name,
    };
  }

  async buildTransaction(
    from: string,
    params: string
  ): Promise<UnsignedTransaction> {
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
        } Using 0x1000000`
      );
      unsignedTransaction.gasLimit = "0x1000000";
    }

    return unsignedTransaction;
  }

  async buildTransactionInsertDidDocument(
    clientId: string,
    body: RequestInsertDidDocumentDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
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
      } = body.params[0];

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
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateBaseDocument(
    clientId: string,
    body: RequestUpdateBaseDocumentDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateBaseDocumentDto, body);

      const { from, did, baseDocument } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateBaseDocument", [did, baseDocument]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAddController(
    clientId: string,
    body: RequestAddControllerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAddControllerDto, body);

      const { from, did, controller } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("addController", [did, controller]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionRevokeController(
    clientId: string,
    body: RequestRevokeControllerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestRevokeControllerDto, body);

      const { from, did, controller } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeController", [did, controller]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAddVerificationMethod(
    clientId: string,
    body: RequestAddVerificationMethodDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAddVerificationMethodDto, body);

      const { from, did, vMethodId, publicKey, isSecp256k1 } = body.params[0];

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
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAddVerificationRelationship(
    clientId: string,
    body: RequestAddVerificationRelationshipDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAddVerificationRelationshipDto, body);

      const { from, did, name, vMethodId, notBefore, notAfter } =
        body.params[0];

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
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionRevokeVerificationMethod(
    clientId: string,
    body: RequestRevokeVerificationMethodDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestRevokeVerificationMethodDto, body);

      const { from, did, vMethodId, notAfter } = body.params[0];

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
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionExpireVerificationMethod(
    clientId: string,
    body: RequestExpireVerificationMethodDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestExpireVerificationMethodDto, body);

      const { from, did, vMethodId, notAfter } = body.params[0];

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
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionRollVerificationMethod(
    clientId: string,
    body: RequestRollVerificationMethodDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestRollVerificationMethodDto, body);

      const {
        from,
        did,
        vMethodId,
        publicKey,
        isSecp256k1,
        notBefore,
        notAfter,
        oldVMethodId,
        duration,
      } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("rollVerificationMethod", [
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
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async sendTransaction(
    clientId: string,
    body: RequestSendSignedTransactionDto,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0];

      await this.verifyTransaction(clientId, request);

      const tx = await (
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);

      return tx.hash;
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}

export default { JsonRpcService };
