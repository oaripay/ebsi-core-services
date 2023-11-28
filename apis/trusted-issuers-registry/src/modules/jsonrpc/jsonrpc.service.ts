import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
} from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import {
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  SignedTransactionParam,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  RequestAddIssuerProxyDto,
  ArgsAddIssuerProxy,
  ArgsUpdateIssuerProxy,
} from "./dto/index.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils.js";
import type { ApiConfig } from "../../config/configuration.js";
import { RequestUpdateIssuerProxyDto } from "./dto/updateIssuerProxy/index.js";

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

  async verifyTransaction(
    param: SignedTransactionParam,
  ): Promise<{ signer: string; functionName: string; args: unknown }> {
    const { unsignedTransaction, r, s, v, signedRawTransaction } = param;

    const unsignedTx = formatEthersUnsignedTransaction(unsignedTransaction);
    const signature = formatEthersSignature(r, s, v);

    // Serialize transaction with and without signature
    const serializedTransaction = ethers.utils.serializeTransaction(unsignedTx);
    const serializedTransactionSigned = ethers.utils.serializeTransaction(
      unsignedTx,
      signature,
    );

    if (serializedTransactionSigned !== signedRawTransaction)
      throw new Error(
        `The unsigned transaction + signature (${serializedTransactionSigned}) does not match with the signedRawTransaction (${signedRawTransaction})`,
      );

    // recover address used to sign
    const digest = ethers.utils.keccak256(serializedTransaction);
    const signer = ethers.utils.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase())
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `,
      );

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
      case "insertPolicy": {
        await validateClass(
          ArgsInsertPolicy,
          args as unknown as ArgsInsertPolicy,
        );
        break;
      }
      case "updatePolicy": {
        await validateClass(
          ArgsUpdatePolicy,
          args as unknown as ArgsUpdatePolicy,
        );
        break;
      }
      case "addIssuerProxy": {
        await validateClass(
          ArgsAddIssuerProxy,
          args as unknown as ArgsAddIssuerProxy,
        );
        break;
      }
      case "updateIssuerProxy": {
        await validateClass(
          ArgsUpdateIssuerProxy,
          args as unknown as ArgsUpdateIssuerProxy,
        );
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
      args,
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

  async buildTransactionInsertPolicy(
    body: RequestInsertPolicyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertPolicyDto, body);

      const { from, policyData, policyId } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertPolicy", [policyId, policyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdatePolicy(
    body: RequestUpdatePolicyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdatePolicyDto, body);

      const { from, policyData, policyId } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updatePolicy", [policyId, policyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddIssuerProxy(
    body: RequestAddIssuerProxyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAddIssuerProxyDto, body);

      const { from, did, proxyData } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("addIssuerProxy", [did, proxyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateIssuerProxy(
    body: RequestUpdateIssuerProxyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateIssuerProxyDto, body);

      const { from, did, proxyId, proxyData } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateIssuerProxy", [
        did,
        proxyId,
        proxyData,
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
    body: RequestSendSignedTransactionDto,
    id?: number | string,
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0]!;

      const { signer } = await this.verifyTransaction(request);

      if (!(await this.isDidControlledByAddress(clientId, signer))) {
        throw new Error(
          `The DID ${clientId} is not controlled by the address ${signer}`,
        );
      }

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

        if (err.stack) {
          error.stack = err.stack;
        }

        throw error;
      }
      throw err;
    }
  }
}

export default JsonRpcService;
