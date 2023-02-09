import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import { ProblemDetailsError } from "@ebsiint-api/shared";
import {
  RequestSendSignedTransactionDto,
  SignedTransactionParam,
  UnsignedTransaction,
  ArgsInsertPolicy,
  RequestInsertPolicyDto,
  ArgsInsertSchema,
  RequestInsertSchemaDto,
  ArgsUpdatePolicy,
  RequestUpdatePolicyDto,
  RequestUpdateMetadataDto,
  ArgsUpdateMetadata,
  RequestUpdateSchemaDto,
  ArgsUpdateSchema,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
  validateSchemaId,
} from "./jsonrpc.utils";
import { ContractService } from "../contract/contract.service";
import { ApiConfig } from "../../config/configuration";

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

  private didRegistry: string;

  private contractAddress: string;

  private timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private contractService: ContractService
  ) {
    this.didRegistry = configService.get<string>("didRegistryApiUrl");
    this.contractAddress = contractService.getContractAddress();
    this.timeout = configService.get<number>("requestTimeout");
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      const { chainId } = await (
        await this.contractService.getContract()
      ).provider.getNetwork();
      this.chainId = ethers.BigNumber.from(chainId).toHexString();
    }
    return this.chainId;
  }

  async getBlockNumber(): Promise<number> {
    return (await this.contractService.getContract()).provider.getBlockNumber();
  }

  async estimateGas(
    transaction: UnsignedTransaction
  ): Promise<ethers.BigNumber> {
    const { from, to, data, value } = transaction;

    return (
      await this.contractService.getContract({ protectedMethod: true })
    ).provider.estimateGas({
      from,
      to,
      data,
      value,
    });
  }

  async isDidControlledByAddress(
    did: string,
    controllerAddress: string
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
      { timeout: this.timeout }
    );

    return data.result;
  }

  async checkWritePermission(address: string, clientId: string): Promise<void> {
    // Check DID Registry
    if (!(await this.isDidControlledByAddress(clientId, address))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${address}`
      );
    }
  }

  async verifyTransaction(
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
      await this.contractService.getContract()
    ).interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertPolicy": {
        await validateClass(
          ArgsInsertPolicy,
          args as unknown as ArgsInsertPolicy
        );
        break;
      }
      case "insertSchema": {
        const argsInsertSchema = args as unknown as ArgsInsertSchema;

        await validateClass(ArgsInsertSchema, argsInsertSchema);

        await validateSchemaId(
          argsInsertSchema.schema,
          argsInsertSchema.schemaId
        );

        break;
      }
      case "updatePolicy": {
        await validateClass(
          ArgsUpdatePolicy,
          args as unknown as ArgsUpdatePolicy
        );
        break;
      }
      case "updateSchema": {
        const argsUpdateSchema = args as unknown as ArgsUpdateSchema;

        await validateClass(ArgsUpdateSchema, argsUpdateSchema);

        await validateSchemaId(
          argsUpdateSchema.schema,
          argsUpdateSchema.schemaId
        );

        break;
      }
      case "updateMetadata": {
        await validateClass(
          ArgsUpdateMetadata,
          args as unknown as ArgsUpdateMetadata
        );
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
      await this.contractService.getContract()
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

  async buildTransactionInsertPolicy(
    body: RequestInsertPolicyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertPolicyDto, body);
      const { from, policyId, policyData } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("insertPolicy", [policyId, policyData]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertSchema(
    body: RequestInsertSchemaDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertSchemaDto, body);

      const { from, schemaId, schema, metadata } = body.params[0];

      await validateSchemaId(schema, schemaId);

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("insertSchema", [
        schemaId,
        schema,
        metadata,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdatePolicy(
    body: RequestUpdatePolicyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdatePolicyDto, body);
      const { from, policyId, policyData } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updatePolicy", [policyId, policyData]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateSchema(
    body: RequestUpdateSchemaDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateSchemaDto, body);

      const { from, schemaId, schema, metadata } = body.params[0];

      await validateSchemaId(schema, schemaId);

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateSchema", [
        schemaId,
        schema,
        metadata,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateMetadata(
    body: RequestUpdateMetadataDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateMetadataDto, body);

      const { from, schemaRevisionId, metadata } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateMetadata", [
        schemaRevisionId,
        metadata,
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
      const { signer } = await this.verifyTransaction(request);

      await this.checkWritePermission(signer, clientId);

      const tx = await (
        await this.contractService.getContract({ protectedMethod: true })
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
