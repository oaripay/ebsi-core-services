import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  RequestSendSignedTransactionDto,
  SignedTransactionParam,
  UnsignedTransaction,
  ArgsInsertLedgerInfo,
  RequestInsertLedgerInfoDto,
  RequestUpdateLedgerInfoByIdDto,
  ArgsUpdateLedgerInfoById,
  RequestInsertSmartContractInfoDto,
  ArgsInsertSmartContractInfo,
  RequestUpdateSmartContractInfoByIdDto,
  ArgsUpdateSmartContractInfoById,
  RequestUpdateSmartContractInfoByNameDto,
  ArgsUpdateSmartContractInfoByName,
  RequestUpdateSmartContractNameDto,
  ArgsUpdateSmartContractName,
  RequestUpdateLedgerInfoByNameDto,
  ArgsUpdateLedgerInfoByName,
  ArgsUpdateLedgerName,
  RequestUpdateLedgerNameDto,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { ContractService } from "../contract/contract.service";
import { ApiConfig } from "../../config/configuration";

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
    const signer = ethers.utils.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase())
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `
      );

    const chainId = await this.getChainId();
    if (unsignedTransaction.chainId !== chainId)
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`
      );

    if (unsignedTransaction.to !== this.contractAddress)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters encoded in unsignedTransaction.data
    const { args, functionFragment } = (
      await this.contractService.getContract()
    ).interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertLedgerInfo": {
        await validateClass(
          ArgsInsertLedgerInfo,
          args as unknown as ArgsInsertLedgerInfo
        );
        break;
      }
      case "updateLedgerInfoById": {
        await validateClass(
          ArgsUpdateLedgerInfoById,
          args as unknown as ArgsUpdateLedgerInfoById
        );
        break;
      }
      case "updateLedgerInfoByName": {
        await validateClass(
          ArgsUpdateLedgerInfoByName,
          args as unknown as ArgsUpdateLedgerInfoByName
        );
        break;
      }
      case "updateLedgerName": {
        await validateClass(
          ArgsUpdateLedgerName,
          args as unknown as ArgsUpdateLedgerName
        );
        break;
      }
      case "insertSmartContractInfo": {
        await validateClass(
          ArgsInsertSmartContractInfo,
          args as unknown as ArgsInsertSmartContractInfo
        );
        break;
      }
      case "updateSmartContractInfoById": {
        await validateClass(
          ArgsUpdateSmartContractInfoById,
          args as unknown as ArgsUpdateSmartContractInfoById
        );
        break;
      }
      case "updateSmartContractInfoByName": {
        await validateClass(
          ArgsUpdateSmartContractInfoByName,
          args as unknown as ArgsUpdateSmartContractInfoByName
        );
        break;
      }
      case "updateSmartContractName": {
        await validateClass(
          ArgsUpdateSmartContractName,
          args as unknown as ArgsUpdateSmartContractName
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

  async buildTransactionInsertLedgerInfo(
    body: RequestInsertLedgerInfoDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertLedgerInfoDto, body);

      const { from, name, info } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("insertLedgerInfo", [name, info]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateLedgerInfoById(
    body: RequestUpdateLedgerInfoByIdDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateLedgerInfoByIdDto, body);

      const { from, ledgerInfoId, info } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateLedgerInfoById", [
        ledgerInfoId,
        info,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateLedgerInfoByName(
    body: RequestUpdateLedgerInfoByNameDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateLedgerInfoByNameDto, body);

      const { from, name, info } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateLedgerInfoByName", [name, info]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateLedgerName(
    body: RequestUpdateLedgerNameDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateLedgerNameDto, body);

      const { from, oldName, newName } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateLedgerName", [oldName, newName]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertSmartContractInfo(
    body: RequestInsertSmartContractInfoDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertSmartContractInfoDto, body);

      const { from, name, info } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("insertSmartContractInfo", [name, info]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateSmartContractInfoById(
    body: RequestUpdateSmartContractInfoByIdDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateSmartContractInfoByIdDto, body);

      const { from, smartContractInfoId, info } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateSmartContractInfoById", [
        smartContractInfoId,
        info,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateSmartContractInfoByName(
    body: RequestUpdateSmartContractInfoByNameDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateSmartContractInfoByNameDto, body);

      const { from, name, info } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateSmartContractInfoByName", [
        name,
        info,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateSmartContractName(
    body: RequestUpdateSmartContractNameDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateSmartContractNameDto, body);

      const { from, oldName, newName } = body.params[0];

      const data = (
        await this.contractService.getContract()
      ).interface.encodeFunctionData("updateSmartContractName", [
        oldName,
        newName,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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
      if (!(await this.isDidControlledByAddress(clientId, signer))) {
        throw new Error(
          `The DID ${clientId} is not controlled by the address ${signer}`
        );
      }

      const tx = await (
        await this.contractService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);
      return tx.hash;
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}

export default { JsonRpcService };
