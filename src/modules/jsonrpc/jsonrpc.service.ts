import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import LedgerService from "../../shared/services/ledger.service";
import {
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSignedTransactionDto,
  UnsignedTransaction,
  SignedTransactionParam,
  ArgsInsertIssuer,
  ArgsUpdateIssuer,
  ArgsInsertAdministrator,
  ArgsUpdateAdministrator,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
} from "./dto";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import { InvalidRequestJsonRpcError } from "./errors";
import { Tir } from "../../contracts";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
  checkHash,
} from "./jsonrpc.utils";
import { prefixWith0x } from "../../shared/utils";

interface AxiosResponseJsonRpc {
  status: number;
  data: JsonRpcResponseObject;
}

interface AxiosErrorResponse {
  message: string;
  response: {
    status: number;
    data: unknown;
  };
}

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private tirContract: Tir;

  private chainId: string = null;

  private accessToken: string = null;

  private expAccessToken: number = null;

  constructor(
    private configService: ConfigService,
    private ledgerService: LedgerService
  ) {
    this.tirContract = this.ledgerService.getContract();
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      const { chainId } = await this.tirContract.provider.getNetwork();
      this.chainId = ethers.BigNumber.from(chainId).toHexString();
    }
    return this.chainId;
  }

  async callBesuAuth(method: string, params: unknown[]): Promise<unknown> {
    const url = `${this.configService.get<string>("ledger")}/blockchains/besu`;
    const data = { jsonrpc: "2.0", method, params, id: 1 };
    const opts = {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    };
    try {
      const response: AxiosResponseJsonRpc = await axios.post(url, data, opts);
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

  async checkWritePermission(address: string): Promise<void> {
    /* TODO: check -->
      - Actor DID must be registered in the DID Registry
      - The actor must be authorized for the write operation in the TIR SC
        - EBSI Admin is authorized in the Trusted IAM SC - query the Trusted IAM Registry API: /administrators
        - Domain admin is authorized in the TIR SC - Query the SC: /administrators
    */
    const did = `did:ebsi:${address.toLowerCase()}`;
    // verify the did is in the TIR Registry
    try {
      await this.tirContract.getAdministrator(did);
    } catch (e) {
      throw new Error(
        `Administrator ${did} was not found in the Trusted Issuers Registry`
      );
    }
  }

  async verifyTransaction(param: SignedTransactionParam): Promise<string> {
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

    if (unsignedTransaction.to !== this.tirContract.address)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.tirContract.address}. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters enconded in unsignedTransaction.data
    const {
      args,
      functionFragment,
    } = this.tirContract.interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertAdministrator": {
        await validateClass(
          ArgsInsertAdministrator,
          (args as unknown) as ArgsInsertAdministrator
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
      case "insertIssuer": {
        await validateClass(
          ArgsInsertIssuer,
          (args as unknown) as ArgsInsertIssuer
        );
        break;
      }
      case "updateIssuer": {
        await validateClass(
          ArgsUpdateIssuer,
          (args as unknown) as ArgsUpdateIssuer
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
      case "updatePolicy": {
        await validateClass(
          ArgsUpdatePolicy,
          (args as unknown) as ArgsUpdatePolicy
        );
        break;
      }
      default:
        throw new Error(
          `The function name ${functionFragment.name} can not be used in this context`
        );
    }

    return signer;
  }

  async buildTransaction(
    from: string,
    params: string
  ): Promise<UnsignedTransaction> {
    const nonceInt = await this.tirContract.provider.getTransactionCount(from);

    const unsignedTransaction: UnsignedTransaction = {
      from,
      to: this.tirContract.address,
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

      const { from, did, attribute } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = this.tirContract.interface.encodeFunctionData(
        "insertAdministrator",
        [did.toLowerCase(), bufferAttribute]
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
      const { from, did, attribute, prevAttributeHash } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = [did.toLowerCase(), bufferAttribute];
      if (prevAttributeHash) data.push(prefixWith0x(prevAttributeHash));
      let functionSig;
      if (prevAttributeHash) {
        // using updateAdministrator function (did, attributeData, lastVersHash)
        functionSig = "updateAdministrator(string,bytes,bytes32)";
      } else {
        // using updateAdministrator function (did, attributeData)
        functionSig = "updateAdministrator(string,bytes)";
      }
      const encodedData = this.tirContract.interface.encodeFunctionData(
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

  async buildTransactionInsertIssuer(
    body: RequestInsertIssuerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertIssuerDto, body);
      const { from, did, attribute } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = this.tirContract.interface.encodeFunctionData(
        "insertIssuer",
        [did.toLowerCase(), bufferAttribute]
      );
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateIssuer(
    body: RequestUpdateIssuerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateIssuerDto, body);
      const { from, did, attribute, prevAttributeHash } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = [did.toLowerCase(), bufferAttribute];
      if (prevAttributeHash) data.push(prefixWith0x(prevAttributeHash));
      let functionSig;
      if (prevAttributeHash) {
        // using updateIssuer function (did, attributeData, lastVersHash)
        functionSig = "updateIssuer(string,bytes,bytes32)";
      } else {
        // using updateIssuer function (did, attributeData)
        functionSig = "updateIssuer(string,bytes)";
      }
      const encodedData = this.tirContract.interface.encodeFunctionData(
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

  async buildTransactionInsertPolicy(
    body: RequestInsertPolicyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertPolicyDto, body);
      const { from, policy, policyId } = body.params[0];
      const bufferPolicy = Buffer.from(policy, "base64");
      const data = this.tirContract.interface.encodeFunctionData(
        "insertPolicy",
        [policyId, bufferPolicy]
      );
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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
      const { from, policy, policyId } = body.params[0];
      const bufferPolicy = Buffer.from(policy, "base64");
      const data = this.tirContract.interface.encodeFunctionData(
        "updatePolicy",
        [policyId, bufferPolicy]
      );
      return await this.buildTransaction(from, data);
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
      const signer = await this.verifyTransaction(request);

      await this.checkWritePermission(signer);

      return (await this.callBesuAuth("eth_sendRawTransaction", [
        request.signedRawTransaction,
      ])) as string;
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}

export default JsonRpcService;
