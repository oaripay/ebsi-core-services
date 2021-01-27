import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { Agent, Scope } from "@cef-ebsi/app-jwt";
import { ConfigService } from "@nestjs/config";
import {
  ArgsInsertHashAlgorithm,
  ArgsUpdateHashAlgorithm,
  ArgsTimestampHashes,
  ArgsTimestampRecordHashes,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestSignedTransactionDto,
  RequestTimestampHashesDto,
  RequestTimestampRecordHashesDto,
  SignedTransactionParam,
  UnsignedTransaction,
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
} from "./jsonrpc.utils";
import LedgerService from "../../shared/services/ledger.service";
import { Timestamp } from "../../contracts/timestamp";
import { Tar } from "../../contracts/trusted-apps-registry/Tar";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private timestampContract: Timestamp;

  private tarContract: Tar;

  private chainId: string = null;

  private accessToken: string = null;

  private expAccessToken: number = null;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private ledgerService: LedgerService
  ) {
    this.timestampContract = this.ledgerService.getContract();
    this.tarContract = this.ledgerService.getTarContract();
  }

  async createSession(): Promise<void> {
    const agent = new Agent(
      Scope.COMPONENT,
      this.configService.get<string>("apiPrivateKey"),
      {
        issuer: "timestamp",
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
      if ((error as AxiosErrorResponse).response) {
        this.logger.error((error as AxiosErrorResponse).response.data);
      }
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
      const { chainId } = await this.timestampContract.provider.getNetwork();
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

  // TODO: implement EBSI admin verification
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async checkWritePermission(
    functionName: string,
    address: string
  ): Promise<void> {
    switch (functionName) {
      /* For the following functions only EBSI Admins
       * can register new algorithms
       *
       * - Check admins on Trusted Apps Registry
       * TODO: check admins in the Trusted Identity and Access Management
       */
      case "insertHashAlgorithm":
      case "updateHashAlgorithm": {
        const did = `did:ebsi:${address.toLowerCase()}`;
        try {
          await this.tarContract.getAdministrator(did);
        } catch (e) {
          throw new Error(
            `Administrator ${did} was not found in the Trusted Apps Registry`
          );
        }
        break;
      }
      /* For the following functions only subjects with access to
       *  EBSI Timestamp API and SC can write
       */
      case "timestampHashes":
      case "timestampRecordHashes":
      case "timestampRecordVersionHashes":
      case "timestampVersionHashes":
      case "appendRecordVersionHashes":
      case "detachRecordVersionHash":
      case "insertRecordVersionInfo":
        // TODO: Verify that the address is included in the DID Registry
        break;

      /* For the following functions only existing record owners
       * are allowed to insert new owners
       */
      case "insertRecordOwner":
      case "revokeRecordOwner":
        // TODO: Verify that the address is included in the DID Registry
        break;
      default:
        // The rest of the functions are open to the public
        break;
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

    if (unsignedTransaction.to !== this.timestampContract.address)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.timestampContract.address}. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters enconded in unsignedTransaction.data
    const {
      args,
      functionFragment,
    } = this.timestampContract.interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertHashAlgorithm": {
        await validateClass(
          ArgsInsertHashAlgorithm,
          (args as unknown) as ArgsInsertHashAlgorithm
        );
        break;
      }
      case "updateHashAlgorithm": {
        await validateClass(
          ArgsUpdateHashAlgorithm,
          (args as unknown) as ArgsUpdateHashAlgorithm
        );
        break;
      }
      case "timestampHashes": {
        await validateClass(
          ArgsTimestampHashes,
          (args as unknown) as ArgsTimestampHashes
        );
        break;
      }
      case "timestampRecordHashes": {
        await validateClass(
          ArgsTimestampRecordHashes,
          (args as unknown) as ArgsTimestampRecordHashes
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
    const nonceInt = await this.timestampContract.provider.getTransactionCount(
      from
    );

    const unsignedTransaction: UnsignedTransaction = {
      from,
      to: this.timestampContract.address,
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

  async buildTransactionInsertHashAlgorithm(
    body: RequestInsertHashAlgorithmDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertHashAlgorithmDto, body);

      const { from, outputLength, ianaName, oid, status } = body.params[0];

      const data = this.timestampContract.interface.encodeFunctionData(
        "insertHashAlgorithm",
        [outputLength, ianaName, oid, status]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateHashAlgorithm(
    body: RequestUpdateHashAlgorithmDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateHashAlgorithmDto, body);

      const {
        from,
        hashAlgorithmId,
        outputLength,
        ianaName,
        oid,
        status,
      } = body.params[0];

      const data = this.timestampContract.interface.encodeFunctionData(
        "updateHashAlgorithm",
        [hashAlgorithmId, outputLength, ianaName, oid, status]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionTimestampHashes(
    body: RequestTimestampHashesDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestTimestampHashesDto, body);

      const {
        from,
        hashAlgorithmIds,
        hashValues,
        timestampData,
      } = body.params[0];

      const data = this.timestampContract.interface.encodeFunctionData(
        "timestampHashes",
        [hashAlgorithmIds, hashValues, timestampData]
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionTimestampRecordHashes(
    body: RequestTimestampRecordHashesDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestTimestampRecordHashesDto, body);

      const {
        from,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionInfo,
      } = body.params[0];

      const data = this.timestampContract.interface.encodeFunctionData(
        "timestampRecordHashes",
        [hashAlgorithmIds, hashValues, timestampData, versionInfo]
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
      const { signer, functionName } = await this.verifyTransaction(request);

      await this.checkWritePermission(functionName, signer);

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
