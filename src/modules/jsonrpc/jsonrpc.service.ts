import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosError } from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  ArgsInsertHashAlgorithm,
  ArgsUpdateHashAlgorithm,
  ArgsTimestampHashes,
  ArgsTimestampRecordHashes,
  ArgsDetachRecordVersionHash,
  ArgsInsertRecordVersionInfo,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestSignedTransactionDto,
  RequestTimestampHashesDto,
  RequestTimestampRecordHashesDto,
  RequestTimestampRecordVersionHashesDto,
  RequestAppendRecordVersionHashesDto,
  RequestDetachRecordVersionHashDto,
  RequestInsertRecordOwnerDto,
  RequestRevokeRecordOwnerDto,
  RequestInsertRecordVersionInfoDto,
  SignedTransactionParam,
  UnsignedTransaction,
  ArgsInsertRecordOwner,
  ArgsRevokeRecordOwner,
  ArgsTimestampRecordVersionHashes,
  ArgsAppendRecordVersionHashes,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { LedgerService } from "../../shared/services/ledger.service";
import { ApiConfig } from "../../config/configuration";
import { UserInfo } from "../auth/auth.interface";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private trustedAppsRegistry: string;

  private didRegistry: string;

  private chainId: string = null;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private ledgerService: LedgerService
  ) {
    this.trustedAppsRegistry = this.configService.get<string>(
      "trustedAppsRegistryApiUrl"
    );
    this.didRegistry = this.configService.get<string>("didRegistryApiUrl");
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

    return (await this.ledgerService.getContract()).provider.estimateGas({
      from,
      to,
      data,
      value,
    });
  }

  async verifyTrustedAppsRegistryAdministrator(user: UserInfo): Promise<void> {
    try {
      await axios.get(`${this.trustedAppsRegistry}/administrators/${user.sub}`);
    } catch (error) {
      if ((error as AxiosError).response?.status === 404)
        throw new Error(
          `${user.sub} not found as administrator in the Trusted Apps Registry`
        );
      throw error;
    }
  }

  async verifyDidRegistry(address: string, user: UserInfo): Promise<void> {
    const response = await axios.get(
      `${this.didRegistry}/identifiers?controller=${address}`
    );
    const { items } = response.data as { items: { did: string }[] };
    if (!items.map((item) => item.did).includes(user.sub))
      throw new Error(
        `The DID ${user.sub} is not controlled by the address ${address}`
      );
  }

  async checkWritePermission(
    functionName: string,
    address: string,
    user: UserInfo
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
        await this.verifyDidRegistry(address, user);
        await this.verifyTrustedAppsRegistryAdministrator(user);
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
      case "insertRecordOwner":
      case "revokeRecordOwner":
        await this.verifyDidRegistry(address, user);
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

    if (
      unsignedTransaction.to !==
      (await this.ledgerService.getContract()).address
    )
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${
          (await this.ledgerService.getContract()).address
        }. Received ${unsignedTransaction.to}`
      );

    // verify function and parameters enconded in unsignedTransaction.data
    const { args, functionFragment } = (
      await this.ledgerService.getContract()
    ).interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertHashAlgorithm": {
        await validateClass(
          ArgsInsertHashAlgorithm,
          args as unknown as ArgsInsertHashAlgorithm
        );
        break;
      }
      case "updateHashAlgorithm": {
        await validateClass(
          ArgsUpdateHashAlgorithm,
          args as unknown as ArgsUpdateHashAlgorithm
        );
        break;
      }
      case "timestampHashes": {
        await validateClass(
          ArgsTimestampHashes,
          args as unknown as ArgsTimestampHashes
        );
        break;
      }
      case "timestampRecordHashes": {
        await validateClass(
          ArgsTimestampRecordHashes,
          args as unknown as ArgsTimestampRecordHashes
        );
        break;
      }
      case "timestampRecordVersionHashes": {
        await validateClass(
          ArgsTimestampRecordVersionHashes,
          args as unknown as ArgsTimestampRecordVersionHashes
        );
        break;
      }
      case "appendRecordVersionHashes": {
        await validateClass(
          ArgsAppendRecordVersionHashes,
          args as unknown as ArgsAppendRecordVersionHashes
        );
        break;
      }
      case "insertRecordOwner": {
        await validateClass(
          ArgsInsertRecordOwner,
          args as unknown as ArgsInsertRecordOwner
        );
        break;
      }
      case "revokeRecordOwner": {
        await validateClass(
          ArgsRevokeRecordOwner,
          args as unknown as ArgsRevokeRecordOwner
        );
        break;
      }
      case "insertRecordVersionInfo": {
        await validateClass(
          ArgsInsertRecordVersionInfo,
          args as unknown as ArgsInsertRecordVersionInfo
        );
        break;
      }
      case "detachRecordVersionHash": {
        await validateClass(
          ArgsDetachRecordVersionHash,
          args as unknown as ArgsDetachRecordVersionHash
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
      await this.ledgerService.getContract()
    ).provider.getTransactionCount(from);

    const unsignedTransaction: UnsignedTransaction = {
      from,
      to: (await this.ledgerService.getContract()).address,
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
      unsignedTransaction.gasLimit = ethers.BigNumber.from(
        Math.ceil(1.4 * Number(gasEstimation))
      ).toHexString();
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

  async buildTransactionInsertHashAlgorithm(
    body: RequestInsertHashAlgorithmDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertHashAlgorithmDto, body);

      const { from, outputLength, ianaName, oid, status } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertHashAlgorithm", [
        outputLength,
        ianaName,
        oid,
        status,
      ]);

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

      const { from, hashAlgorithmId, outputLength, ianaName, oid, status } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateHashAlgorithm", [
        hashAlgorithmId,
        outputLength,
        ianaName,
        oid,
        status,
      ]);

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

      const { from, hashAlgorithmIds, hashValues, timestampData } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("timestampHashes", [
        hashAlgorithmIds,
        hashValues,
        timestampData || [],
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertRecordOwner(
    body: RequestInsertRecordOwnerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertRecordOwnerDto, body);

      const { from, recordId, ownerId, notBefore, notAfter } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertRecordOwner", [
        recordId,
        ownerId,
        notBefore,
        notAfter,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionRevokeRecordOwner(
    body: RequestRevokeRecordOwnerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestRevokeRecordOwnerDto, body);

      const { from, recordId, ownerId } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeRecordOwner", [recordId, ownerId]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertRecordVersionInfo(
    body: RequestInsertRecordVersionInfoDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertRecordVersionInfoDto, body);

      const { from, recordId, versionId, versionInfo } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertRecordVersionInfo", [
        recordId,
        versionId,
        versionInfo,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionDetachRecordVersionHash(
    body: RequestDetachRecordVersionHashDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDetachRecordVersionHashDto, body);

      const { from, recordId, versionId, hashValue } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("detachRecordVersionHash", [
        recordId,
        versionId,
        hashValue,
      ]);
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

      const { from, hashAlgorithmIds, hashValues, timestampData, versionInfo } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("timestampRecordHashes", [
        hashAlgorithmIds,
        hashValues,
        timestampData || [],
        versionInfo,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionTimestampRecordVersionHashes(
    body: RequestTimestampRecordVersionHashesDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestTimestampRecordVersionHashesDto, body);

      const {
        from,
        recordId,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionInfo,
      } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("timestampRecordVersionHashes", [
        recordId,
        hashAlgorithmIds,
        hashValues,
        timestampData || [],
        versionInfo,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAppendRecordVersionHashes(
    body: RequestAppendRecordVersionHashesDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAppendRecordVersionHashesDto, body);

      const {
        from,
        recordId,
        versionId,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionInfo,
      } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("appendRecordVersionHashes", [
        recordId,
        versionId,
        hashAlgorithmIds,
        hashValues,
        timestampData || [],
        versionInfo,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async sendTransaction(
    body: RequestSignedTransactionDto,
    user: UserInfo,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestSignedTransactionDto, body);

      const request = body.params[0];
      const { signer, functionName } = await this.verifyTransaction(request);

      await this.checkWritePermission(functionName, signer, user);

      const tx = await (
        await this.ledgerService.getContract()
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
