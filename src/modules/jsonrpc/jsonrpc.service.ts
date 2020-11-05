import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { Agent, Scope } from "@cef-ebsi/app-jwt";
import { ConfigService } from "@nestjs/config";
import LedgerService from "../../shared/services/ledger.service";
import RequestInsertIssuerDto from "./dto/insertIssuer/request-insert-issuer.dto";
import RequestUpdateIssuerDto from "./dto/updateIssuer/request-update-issuer.dto";
import RequestInsertAdministratorDto from "./dto/insertAdministrator/request-insert-administrator.dto";
import RequestInsertPolicyDto from "./dto/insertPolicy/request-insert-policy.dto";
import RequestSignedTransactionDto from "./dto/signedTransaction/request-signed-transaction.dto";
import UnsignedTransaction from "./dto/signedTransaction/unsigned-transaction.dto";
import JsonRpcResponseObject from "./types/jsonrpc.interface";
import { InvalidRequestJsonRpcError } from "./errors";
import TrustedIssuersRegistryContract from "../../shared/types/trusted-issuers-registry.interface";
import ParamSignedTransaction from "./dto/signedTransaction/param.dto";
import ArgsInsertIssuer from "./dto/signedTransaction/args-insert-issuer.dto";
import ArgsUpdateIssuer from "./dto/signedTransaction/args-update-issuer.dto";
import ArgsInsertAdministrator from "./dto/signedTransaction/args-insert-administrator.dto";
import ArgsInsertPolicy from "./dto/signedTransaction/args-insert-policy.dto";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { prefixWith0x } from "../../shared/utils";

interface AxiosResponseSessions {
  status: number;
  data: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    issuedAt: number;
  };
}

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
export default class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private ethersProvider:
    | ethers.providers.Provider
    | ethers.providers.JsonRpcProvider;

  private tirContract: TrustedIssuersRegistryContract;

  private tirAddress: string;

  private tirInterface: ethers.utils.Interface;

  private chainId: string = null;

  private accessToken: string = null;

  private expAccessToken: number = null;

  constructor(
    private configService: ConfigService,
    private ledgerService: LedgerService
  ) {
    this.tirContract = this.ledgerService.getContract();
    this.tirAddress = this.ledgerService.getAddress();
    this.tirInterface = this.ledgerService.getInterface();
    this.ethersProvider = this.ledgerService.getProvider();
  }

  async createSession(): Promise<void> {
    const agent = new Agent(
      Scope.COMPONENT,
      this.configService.get<string>("apiPrivateKey"),
      {
        issuer: "trusted-issuers-registry",
      }
    );
    const requestToken = (await agent.createRequestPayload(
      "ebsi-ledger"
    )) as string;
    const url = `${this.configService.get<string>("ledger")}/sessions`;
    try {
      const response: AxiosResponseSessions = await axios.post(
        url,
        requestToken
      );
      this.accessToken = response.data.accessToken;
      this.expAccessToken =
        Number(response.data.issuedAt) + Number(response.data.expiresIn);
    } catch (error) {
      this.logger.error("Error creating new session with ledger api");
      this.logger.error((error as Error).message);
      this.logger.error((error as Error).stack);
      throw new Error(
        "Error checking session: A new session with ledger api could not be established"
      );
    }
  }

  isAccessTokenExpired(): boolean {
    return (
      !this.accessToken ||
      !this.expAccessToken ||
      Date.now() > this.expAccessToken * 1000
    );
  }

  async checkSession(): Promise<void> {
    if (this.isAccessTokenExpired()) await this.createSession();
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      const { chainId } = await this.ethersProvider.getNetwork();
      this.chainId = ethers.BigNumber.from(chainId).toHexString();
    }
    return this.chainId;
  }

  async callBesuAuth(method: string, params: unknown[]): Promise<unknown> {
    await this.checkSession();
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
    const attributesLastHash = await this.tirContract.getIssuer(did);
    if (attributesLastHash.length === 0) {
      throw new Error(
        `Issuer ${did} was not found in the Trusted Issuer Registry`
      );
    }
  }

  async verifyTransaction(param: ParamSignedTransaction): Promise<string> {
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

    if (unsignedTransaction.to !== this.tirAddress)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.tirAddress}. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters enconded in unsignedTransaction.data
    const { args, functionFragment } = this.tirInterface.parseTransaction(
      unsignedTransaction
    );

    switch (functionFragment.name) {
      case "insertAdministrator": {
        await validateClass(ArgsInsertAdministrator, args);
        break;
      }
      case "insertIssuer": {
        await validateClass(ArgsInsertIssuer, args);
        break;
      }
      case "updateIssuer": {
        await validateClass(ArgsUpdateIssuer, args);
        break;
      }
      case "insertPolicy": {
        await validateClass(ArgsInsertPolicy, args);
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
    scFunction: string,
    params: (string | Buffer)[]
  ): Promise<UnsignedTransaction> {
    const nonceInt = await this.ethersProvider.getTransactionCount(from);
    const unsignedTransaction: UnsignedTransaction = {
      from,
      to: this.tirAddress,
      data: this.tirInterface.encodeFunctionData(scFunction, params),
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
      const expectedHash = ethers.utils.keccak256(bufferAttribute);
      if (prefixWith0x(attribute.hash) !== expectedHash)
        throw new Error(
          `Invalid attribute.hash. Received: ${prefixWith0x(
            attribute.hash
          )}. Expected: ${expectedHash}`
        );
      const data = [did.toLowerCase(), bufferAttribute];
      return await this.buildTransaction(from, "insertAdministrator", data);
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
      const expectedHash = ethers.utils.keccak256(bufferAttribute);
      if (prefixWith0x(attribute.hash) !== expectedHash)
        throw new Error(
          `Invalid issuer.attribute.hash. Received: ${prefixWith0x(
            attribute.hash
          )}. Expected: ${expectedHash}`
        );
      const data = [did.toLowerCase(), bufferAttribute];
      return await this.buildTransaction(from, "insertIssuer", data);
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
      const expectedHash = ethers.utils.keccak256(bufferAttribute);
      if (prefixWith0x(attribute.hash) !== expectedHash)
        throw new Error(
          `Invalid issuer.attribute.hash. Received: ${prefixWith0x(
            attribute.hash
          )}. Expected: ${expectedHash}`
        );
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
      return await this.buildTransaction(from, functionSig, data);
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
      const data = [policyId, bufferPolicy];
      return await this.buildTransaction(from, "insertPolicy", data);
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

      return this.callBesuAuth("eth_sendRawTransaction", [
        request.signedRawTransaction,
      ]) as Promise<string>;
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}
