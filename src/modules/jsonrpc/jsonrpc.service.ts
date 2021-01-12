import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { Agent, Scope } from "@cef-ebsi/app-jwt";
import { ConfigService } from "@nestjs/config";
import {
  RequestInsertAppDto,
  RequestInsertAppAdministratorDto,
  RequestInsertAppInfoDto,
  RequestInsertAdministratorDto,
  RequestSignedTransactionDto,
  RequestUpdateAdministratorDto,
  RequestUpdateAppDto,
  RequestInsertRevocationDto,
  RequestUpdateAppPublicKeyDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestInsertAuthorizationDto,
  RequestUpdateAuthorizationDto,
  UnsignedTransaction,
  ArgsInsertApp,
  ArgsInsertAppAdministrator,
  ArgsInsertAppInfo,
  ArgsInsertAdministrator,
  ArgsUpdateAdministrator,
  ArgsUpdateApp,
  ArgsInsertRevocation,
  ArgsUpdateAppPublicKey,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  ArgsInsertAuthorization,
  ArgsUpdateAuthorization,
  SignedTransactionParam,
} from "./dto";
import {
  AxiosResponseSessions,
  AxiosResponseJsonRpc,
  AxiosErrorResponse,
} from "./jsonrpc.interface";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
  checkHash,
  computePermissions,
} from "./jsonrpc.utils";
import LedgerService from "../../shared/services/ledger.service";
import { Tar } from "../../contracts/Tar";
import { ApiConfig } from "../../config/configuration";
import { prefixWith0x } from "../../shared/utils";

const statusId = {
  active: 0,
  revoked: 1,
  suspended: 2,
};

const domainId = {
  ebsi: 0,
  external: 1,
};

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private tarContract: Tar;

  private chainId: string = null;

  private accessToken: string = null;

  private expAccessToken: number = null;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private ledgerService: LedgerService
  ) {
    this.tarContract = this.ledgerService.getContract();
  }

  async createSession(): Promise<void> {
    const agent = new Agent(
      Scope.COMPONENT,
      this.configService.get<string>("apiPrivateKey"),
      {
        issuer: "trusted-apps-registry",
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
      const { chainId } = await this.tarContract.provider.getNetwork();
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
      - The actor must be authorized for the write operation in the TAR SC
        - EBSI Admin is authorized in the Trusted IAM SC - query the Trusted IAM Registry API: /administrators
        - Domain admin is authorized in the TAR SC - Query the SC: /administrators
    */
    const did = `did:ebsi:${address.toLowerCase()}`;
    // verify the did is in the TAR Registry
    try {
      await this.tarContract.getAdministrator(did);
    } catch (e) {
      throw new Error(
        `Administrator ${did} was not found in the Trusted Apps Registry`
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

    if (unsignedTransaction.to !== this.tarContract.address)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.tarContract.address}. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters enconded in unsignedTransaction.data
    const {
      args,
      functionFragment,
    } = this.tarContract.interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertApp": {
        await validateClass(ArgsInsertApp, args);
        break;
      }
      case "insertAppAdministrator": {
        await validateClass(ArgsInsertAppAdministrator, args);
        break;
      }
      case "insertAppInfo": {
        await validateClass(ArgsInsertAppInfo, args);
        break;
      }
      case "insertAdministrator": {
        await validateClass(ArgsInsertAdministrator, args);
        break;
      }
      case "updateAdministrator": {
        await validateClass(ArgsUpdateAdministrator, args);
        break;
      }
      case "updateApp": {
        await validateClass(ArgsUpdateApp, args);
        break;
      }
      case "insertRevocation": {
        await validateClass(ArgsInsertRevocation, args);
        break;
      }
      case "insertPolicy": {
        await validateClass(ArgsInsertPolicy, args);
        break;
      }
      case "updateAppPublicKey": {
        await validateClass(ArgsUpdateAppPublicKey, args);
        break;
      }
      case "updatePolicy": {
        await validateClass(ArgsUpdatePolicy, args);
        break;
      }
      case "insertAuthorization": {
        await validateClass(ArgsInsertAuthorization, args);
        break;
      }
      case "updateAuthorization": {
        await validateClass(ArgsUpdateAuthorization, args);
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
    const nonceInt = await this.tarContract.provider.getTransactionCount(from);

    const unsignedTransaction: UnsignedTransaction = {
      from,
      to: this.tarContract.address,
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

  async buildTransactionInsertApp(
    body: RequestInsertAppDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppDto, body);

      const {
        from,
        name,
        domain,
        appAdministrator,
        publicKey,
        status,
        notBefore,
        notAfter,
      } = body.params[0];

      const bufferPublicKey = Buffer.from(publicKey, "utf8");

      const data = this.tarContract.interface.encodeFunctionData("insertApp", [
        name,
        domainId[domain],
        appAdministrator,
        bufferPublicKey,
        statusId[status],
        notBefore,
        notAfter,
      ]);

      return this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertAppAdministrator(
    body: RequestInsertAppAdministratorDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppAdministratorDto, body);

      const { from, applicationId, administratorId } = body.params[0];

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAppAdministrator",
        [applicationId, administratorId]
      );

      return this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertAppInfo(
    body: RequestInsertAppInfoDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppInfoDto, body);

      const { from, applicationId, info } = body.params[0];
      const infoBytes = Buffer.from(JSON.stringify(info), "utf8");

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAppInfo",
        [applicationId, infoBytes]
      );

      return this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
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

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAdministrator",
        [did.toLowerCase(), bufferAttribute]
      );

      return this.buildTransaction(from, data);
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

      // TODO: double check result
      const encodedData = this.tarContract.interface.encodeFunctionData(
        functionSig,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        data
      );

      return this.buildTransaction(from, encodedData);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertRevocation(
    body: RequestInsertRevocationDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertRevocationDto, body);

      const { from, applicationId, revokedBy, notBefore } = body.params[0];

      const data = this.tarContract.interface.encodeFunctionData(
        "insertRevocation",
        [applicationId, revokedBy, notBefore]
      );

      return this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateApp(
    body: RequestUpdateAppDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAppDto, body);

      const { from, applicationId, name, domain } = body.params[0];

      const data = this.tarContract.interface.encodeFunctionData("updateApp", [
        applicationId,
        name,
        domainId[domain],
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateAppPublicKey(
    body: RequestUpdateAppPublicKeyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAppPublicKeyDto, body);

      const { from, publicKeyId, status, notAfter } = body.params[0];

      const data = this.tarContract.interface.encodeFunctionData(
        "updateAppPublicKey",
        [publicKeyId, statusId[status], notAfter]
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
      const { from, policy, policyId } = body.params[0];
      const bufferPolicy = Buffer.from(policy, "base64");

      const data = this.tarContract.interface.encodeFunctionData(
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

      const data = this.tarContract.interface.encodeFunctionData(
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

  async buildTransactionInsertAuthorization(
    body: RequestInsertAuthorizationDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAuthorizationDto, body);

      const {
        from,
        name,
        authorizedAppName,
        iss,
        status,
        permissions,
        notBefore,
        notAfter,
      } = body.params[0];

      const permissionsInteger = computePermissions(permissions);

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAuthorization",
        [
          name,
          authorizedAppName,
          iss,
          statusId[status],
          permissionsInteger,
          notBefore,
          notAfter,
        ]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateAuthorization(
    body: RequestUpdateAuthorizationDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAuthorizationDto, body);

      const {
        from,
        authorizationId,
        status,
        permissions,
        notAfter,
      } = body.params[0];

      const permissionsInteger = computePermissions(permissions);

      const data = this.tarContract.interface.encodeFunctionData(
        "updateAuthorization",
        [authorizationId, statusId[status], permissionsInteger, notAfter]
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

export default { JsonRpcService };
