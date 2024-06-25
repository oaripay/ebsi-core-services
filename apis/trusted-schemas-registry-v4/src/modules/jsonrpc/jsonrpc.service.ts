import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  extractNamedAttributes,
} from "@ebsiint-api/shared";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import type { JsonRpcSchema } from "./validators/JsonRpcSchema.js";
import {
  insertSchemaSchema,
  requestInsertSchemaSchema,
} from "./validators/RequestInsertSchemaSchema.js";
import {
  requestUpdateSchemaSchema,
  updateSchemaSchema,
} from "./validators/RequestUpdateSchemaSchema.js";
import {
  requestUpdateMetadataSchema,
  updateMetadataSchema,
} from "./validators/RequestUpdateMetadataSchema.js";
import {
  requestSendSignedTransactionDtoSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
} from "./validators/RequestSendSignedTransactionSchema.js";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId = "";

  private didRegistry: string;

  private contractAddress: string;

  private timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.didRegistry = configService.get<string>("didRegistryApiUrl");
    this.contractAddress = ledgerService.getContractAddress();
    this.timeout = configService.get<number>("requestTimeout");
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

  async getBlockNumber(): Promise<number> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).provider.getBlockNumber();
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new Error(getErrorMessage(error));
    }
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
        this.logger.error(error);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async isDidControlledByAddress(
    did: string,
    controllerAddress: string,
  ): Promise<boolean> {
    const { data } = await axios.post<{
      result: boolean;
    }>(
      `${this.didRegistry}/identifiers/${did}/actions`,
      {
        jsonrpc: "2.0",
        method: "checkController",
        params: [controllerAddress],
      },
      { timeout: this.timeout },
    );

    return data.result;
  }

  async checkWritePermission(address: string, clientId: string): Promise<void> {
    // Check DID Registry
    if (!(await this.isDidControlledByAddress(clientId, address))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${address}`,
      );
    }
  }

  async verifyTransaction(
    param: SendSignedTransactionParamsSchema,
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
      case "insertSchema": {
        await insertSchemaSchema.parseAsync(argsObject);
        break;
      }
      case "updateSchema": {
        await updateSchemaSchema.parseAsync(argsObject);
        break;
      }
      case "updateMetadata": {
        await updateMetadataSchema.parseAsync(argsObject);
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
  }

  async buildTransactionInsertSchema(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestInsertSchemaSchema.parseAsync(body);

      const { from, schemaId, schema, metadata } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertSchema", [
        schemaId,
        schema,
        metadata,
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

  async buildTransactionUpdateSchema(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestUpdateSchemaSchema.parseAsync(body);

      const { from, schemaId, schema, metadata } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateSchema", [
        schemaId,
        schema,
        metadata,
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

  async buildTransactionUpdateMetadata(
    body: JsonRpcSchema,
    id: number | string | null | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestUpdateMetadataSchema.parseAsync(body);

      const { from, schemaRevisionId, metadata } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateMetadata", [
        schemaRevisionId,
        metadata,
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

  async sendTransaction(
    clientId: string,
    body: JsonRpcSchema,
    id: number | string | null | undefined,
  ): Promise<string> {
    try {
      const parsedBody =
        await requestSendSignedTransactionDtoSchema.parseAsync(body);

      const request = parsedBody.params[0]!;

      const { signer } = await this.verifyTransaction(request);

      await this.checkWritePermission(signer, clientId);

      const tx = await (
        await this.ledgerService.getContract()
      ).provider.sendTransaction(request.signedRawTransaction);
      return tx.hash;
    } catch (err) {
      if (isEthersError(err)) {
        this.logger.error(err); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(err.reason, id); // throw simplified ethers error to the user
      }
      if (err instanceof Error) {
        const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);

        if (err.stack) {
          error.stack = err.stack;
        }

        throw error;
      }
      throw err;
    }
  }
}

export default { JsonRpcService };
