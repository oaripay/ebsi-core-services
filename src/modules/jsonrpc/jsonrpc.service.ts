import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  RequestSignedTransactionDto,
  SignedTransactionParam,
  UnsignedTransaction,
  ArgsInsertPolicy,
  RequestInsertPolicyDto,
  ArgsInsertAdministrator,
  ArgsInsertSchema,
  ArgsUpdateAdministrator,
  RequestInsertAdministratorDto,
  RequestInsertSchemaDto,
  RequestUpdateAdministratorDto,
  RequestUpdateMetadataDto,
  ArgsUpdateMetadata,
  RequestUpdateSchemaDto,
  ArgsUpdateSchema,
} from "./dto";
import { AxiosResponseJsonRpc, AxiosErrorResponse } from "./jsonrpc.interface";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { ContractService } from "../../shared/services/contract.service";
import { SchemaSCRegistry } from "../../contracts/trusted-schemas";
import { ApiConfig } from "../../config/configuration";
import { prefixWith0x } from "../../shared/utils";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private schemaSCRegistryContract: SchemaSCRegistry;

  private chainId: string = null;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private contractService: ContractService
  ) {
    this.schemaSCRegistryContract = this.contractService.getContract();
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      const {
        chainId,
      } = await this.schemaSCRegistryContract.provider.getNetwork();
      this.chainId = ethers.BigNumber.from(chainId).toHexString();
    }
    return this.chainId;
  }

  async getBlockNumber(): Promise<number> {
    return this.schemaSCRegistryContract.provider.getBlockNumber();
  }

  async callBesuAuth(method: string, params: unknown[]): Promise<unknown> {
    const url = `${this.configService.get<string>("ledger")}/blockchains/besu`;
    const data = { jsonrpc: "2.0", method, params, id: 1 };

    try {
      const response: AxiosResponseJsonRpc = await axios.post(url, data);
      if (response.data.error) {
        throw new Error(JSON.stringify(response.data.error));
      }
      return response.data.result;
    } catch (error) {
      const errorAxios = error as AxiosErrorResponse;
      if (errorAxios.response && errorAxios.response.data) {
        let message: string;
        if (typeof errorAxios.response.data === "object")
          message = JSON.stringify(errorAxios.response.data);
        else message = errorAxios.response.data as string;
        throw new Error(message);
      }
      throw error;
    }
  }

  async estimateGas(transaction: UnsignedTransaction): Promise<string> {
    const { from, to, data, value } = transaction;

    return this.callBesuAuth("eth_estimateGas", [
      { from, to, data, value },
    ]) as Promise<string>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkWritePermission(func: string, address: string): Promise<void> {
    // TODO: implement EBSI admin verification?
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

    if (serializedTransactionSigned !== signedRawTransaction)
      throw new Error(
        `The unsigned transaction + signature (${serializedTransactionSigned}) does not match with the signedRawTransaction (${signedRawTransaction})`
      );

    // recover address used to sign
    const digest = ethers.utils.keccak256(serializedTransaction);
    const signer = ethers.utils.recoverAddress(digest, signature).toLowerCase();

    if (signer !== unsignedTransaction.from.toLowerCase())
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `
      );

    const chainId = await this.getChainId();
    if (unsignedTransaction.chainId !== chainId)
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`
      );

    if (unsignedTransaction.to !== this.schemaSCRegistryContract.address)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.schemaSCRegistryContract.address}. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters enconded in unsignedTransaction.data
    const {
      args,
      functionFragment,
    } = this.schemaSCRegistryContract.interface.parseTransaction(
      unsignedTransaction
    );

    switch (functionFragment.name) {
      case "insertAdministrator": {
        await validateClass(
          ArgsInsertAdministrator,
          (args as unknown) as ArgsInsertAdministrator
        );
        break;
      }
      case "insertPolicy": {
        await validateClass(
          ArgsInsertPolicy,
          (args as unknown) as ArgsInsertPolicy
        );
        break;
      }
      case "insertSchema": {
        await validateClass(
          ArgsInsertSchema,
          (args as unknown) as ArgsInsertSchema
        );
        break;
      }
      case "updateAdministrator": {
        await validateClass(
          ArgsUpdateAdministrator,
          (args as unknown) as ArgsUpdateAdministrator
        );
        break;
      }
      case "updateSchema": {
        await validateClass(
          ArgsUpdateSchema,
          (args as unknown) as ArgsUpdateSchema
        );
        break;
      }
      case "updateMetadata": {
        await validateClass(
          ArgsUpdateMetadata,
          (args as unknown) as ArgsUpdateMetadata
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
    const nonceInt = await this.schemaSCRegistryContract.provider.getTransactionCount(
      from
    );

    const unsignedTransaction: UnsignedTransaction = {
      from,
      to: this.schemaSCRegistryContract.address,
      data: params,
      value: "0x0",
      nonce: ethers.BigNumber.from(nonceInt).toHexString(),
      chainId: await this.getChainId(),
      gasLimit: "0x1000000",
      gasPrice: "0x0",
    };

    let gasEstimation = "unset";

    try {
      gasEstimation = await this.estimateGas(unsignedTransaction);
      unsignedTransaction.gasLimit = ethers.BigNumber.from(
        Math.ceil(1.4 * Number(gasEstimation))
      ).toHexString();
    } catch (error) {
      this.logger.warn(
        `Gas could not be estimated.${
          gasEstimation === "unset" ? "" : `Received ${gasEstimation}.`
        } Using 0x1000000`
      );
      unsignedTransaction.gasLimit = "0x1000000";
    }

    return unsignedTransaction;
  }

  async buildTransactionInsertAdministrator(
    body: RequestInsertAdministratorDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAdministratorDto, body);

      const { from, did, attributeData } = body.params[0];

      const data = this.schemaSCRegistryContract.interface.encodeFunctionData(
        "insertAdministrator",
        [did.toLowerCase(), attributeData]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertPolicy(
    body: RequestInsertPolicyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertPolicyDto, body);
      const { from, policyId, policyData } = body.params[0];

      const data = this.schemaSCRegistryContract.interface.encodeFunctionData(
        "insertPolicy",
        [policyId, policyData]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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

      const data = this.schemaSCRegistryContract.interface.encodeFunctionData(
        "insertSchema",
        [schemaId, schema, metadata]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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

      const data = this.schemaSCRegistryContract.interface.encodeFunctionData(
        "updateSchema",
        [schemaId, schema, metadata]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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

      const data = this.schemaSCRegistryContract.interface.encodeFunctionData(
        "updateMetadata",
        [schemaRevisionId, metadata]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateAdministrator(
    body: RequestUpdateAdministratorDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAdministratorDto, body);

      const { from, did, attributeData, prevAttributeHash } = body.params[0];

      const data = [did.toLowerCase(), attributeData];

      if (prevAttributeHash) {
        data.push(prefixWith0x(prevAttributeHash));
      }

      let functionSig;

      if (prevAttributeHash) {
        // using updateAdministrator function (did, attributeData, lastVersHash)
        functionSig = "updateAdministrator(string,bytes,bytes32)";
      } else {
        // using updateAdministrator function (did, attributeData)
        functionSig = "updateAdministrator(string,bytes)";
      }

      const encodedData = this.schemaSCRegistryContract.interface.encodeFunctionData(
        functionSig,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        data
      );

      return await this.buildTransaction(from, encodedData);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async sendTransaction(
    body: RequestSignedTransactionDto,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestSignedTransactionDto, body);

      const request = body.params[0];
      const { signer, functionName } = await this.verifyTransaction(request);

      await this.checkWritePermission(functionName, signer);
      const res = (await this.callBesuAuth("eth_sendRawTransaction", [
        request.signedRawTransaction,
      ])) as string;
      return res;
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}

export default { JsonRpcService };
