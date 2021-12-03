import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosError } from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import KeyEncoder from "key-encoder";
import { isISO8601 } from "class-validator";
import {
  ArgsInsertHashAlgorithm,
  ArgsUpdateHashAlgorithm,
  ArgsTimestampHashes,
  ArgsTimestampRecordHashes,
  ArgsDetachRecordVersionHash,
  ArgsInsertRecordVersionInfo,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  RequestSendSignedTransactionDto,
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
  RequestTimestampVersionHashesDto,
  ArgsTimestampVersionHashes,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { LedgerService } from "../../shared/services/ledger.service";
import RecordsService from "../records/records.service";
import { ApiConfig } from "../../config/configuration";
import { UserInfo } from "../auth/auth.interface";
import { AdministratorResponseObject } from "./jsonrpc.interface";

const keyEncoder = new KeyEncoder("secp256k1");
// Cache algorightms' output lengths for 30 minutes
const ALGORITHMS_EXP = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private trustedAppsRegistry: string;

  private didRegistry: string;

  private chainId: string = null;

  private algIdsToOutputLength: Record<
    number,
    { outputLength: number; exp: number }
  > = {};

  constructor(
    private configService: ConfigService<ApiConfig>,
    private ledgerService: LedgerService,
    private recordsService: RecordsService
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

  async allowAdministratorsOnly(did: string): Promise<void> {
    let admin: AdministratorResponseObject;
    try {
      const response = await axios.get<AdministratorResponseObject>(
        `${this.trustedAppsRegistry}/administrators/${did}`
      );
      admin = response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404)
        throw new Error(
          `${did} not found as administrator in the Trusted Apps Registry`
        );
      throw error;
    }

    const firstAttributeString = Buffer.from(
      admin.attributes[0].body,
      "base64"
    ).toString();
    let attribute: {
      validFrom: string;
      validTo: string;
    };

    try {
      attribute = JSON.parse(firstAttributeString) as {
        validFrom: string;
        validTo: string;
      };
    } catch (error) {
      throw new Error(
        `Administrator ${did} does not contain a valid JSON in the first attribute`
      );
    }

    const { validFrom, validTo } = attribute;
    const now = new Date();
    if (
      !isISO8601(validFrom) ||
      new Date(validFrom) > now ||
      (validTo && (!isISO8601(validTo) || new Date(validTo) < now))
    )
      throw new Error(`Administrator ${did} is disabled`);
  }

  async isDidControlledByAddress(
    did: string,
    controllerAddress: string,
    currentPage = 1
  ): Promise<boolean> {
    const pageSize = 50;

    const { data } = await axios.get<{
      items: { did: string }[];
      total: number;
    }>(
      `${this.didRegistry}/identifiers?controller=${controllerAddress}&page[size]=${pageSize}&page[after]=${currentPage}`
    );

    // Check if DID is in the list
    if (data.items.map((item) => item.did).includes(did)) {
      return true;
    }

    // Recursive call if there are more pages
    if (currentPage * pageSize < data.total) {
      return this.isDidControlledByAddress(
        did,
        controllerAddress,
        currentPage + 1
      );
    }

    return false;
  }

  async verifyEthereumAddress(address: string, user: UserInfo): Promise<void> {
    if (user.login_hint === "did_siop") {
      if (!(await this.isDidControlledByAddress(user.sub, address))) {
        throw new Error(
          `The DID ${user.sub} is not controlled by the address ${address}`
        );
      }

      return;
    }

    // Get and verify the ethereum address from the Trusted Apps Registry
    let response = await axios.get(
      `${this.trustedAppsRegistry}/apps?name=${user.sub}`
    );

    const { items } = response.data as { items: { href: string }[] };

    if (items.length === 0) {
      throw new Error(`App ${user.sub} not found in the Trusted Apps Registry`);
    }

    const { href } = items[0];

    response = await axios.get(href);

    const { publicKeys } = response.data as { publicKeys: string[] };

    const addresses = publicKeys.map((publicKey) => {
      try {
        const publicKeyPem = Buffer.from(publicKey, "base64").toString("utf8");
        const publicKeyHex = keyEncoder.encodePublic(
          publicKeyPem,
          "pem",
          "raw"
        );
        return ethers.utils.computeAddress(`0x${publicKeyHex}`).toLowerCase();
      } catch (error) {
        return "0x0000000000000000000000000000000000000000";
      }
    });

    if (!addresses.includes(address.toLowerCase())) {
      throw new Error(
        `Address ${address} can not be derived from public keys of ${user.sub}`
      );
    }
  }

  async verifyRecordOwner(address: string, recordId: string): Promise<void> {
    let ownerIds = [];
    try {
      const record = await (
        await this.ledgerService.getContract()
      ).getRecord(recordId);
      ownerIds = record.ownerIds.map((r) => r.toLowerCase());
    } catch (e) {
      throw new Error(
        `recordId ${recordId} could not be retrieved: ${(e as Error).message}`
      );
    }

    if (!ownerIds.includes(address.toLowerCase()))
      throw new Error(`Only record owners can update records`);
  }

  async checkWritePermission(
    functionName: string,
    address: string,
    user: UserInfo,
    args: ethers.utils.Result
  ): Promise<void> {
    switch (functionName) {
      case "insertHashAlgorithm":
      case "updateHashAlgorithm": {
        await this.verifyEthereumAddress(address, user);
        await this.allowAdministratorsOnly(user.sub);
        break;
      }
      /* For the following functions only subjects with access to
       *  EBSI Timestamp API and SC can write
       */
      case "timestampHashes":
      case "timestampVersionHashes":
      case "timestampRecordHashes":
        await this.verifyEthereumAddress(address, user);
        break;
      case "timestampRecordVersionHashes":
      case "appendRecordVersionHashes":
      case "detachRecordVersionHash":
      case "insertRecordVersionInfo":
      case "insertRecordOwner":
      case "revokeRecordOwner":
        await this.verifyEthereumAddress(address, user);
        await this.verifyRecordOwner(
          address,
          (
            args as unknown as
              | ArgsTimestampRecordVersionHashes
              | ArgsAppendRecordVersionHashes
              | ArgsDetachRecordVersionHash
              | ArgsInsertRecordVersionInfo
              | ArgsInsertRecordOwner
              | ArgsRevokeRecordOwner
          ).recordId
        );
        break;
      default:
        // The rest of the functions are open to the public
        break;
    }
  }

  async checkHashes(
    hashAlgorithmIds: number[],
    hashValues: string[]
  ): Promise<void> {
    if (hashAlgorithmIds.length !== hashValues.length) {
      throw new Error(
        "hashAlgorithmIds and hashValues don't have the same length"
      );
    }

    const now = Date.now();
    const uniqHashAlgorithmIds = [...new Set(hashAlgorithmIds)];

    await Promise.all(
      uniqHashAlgorithmIds.map(async (algId) => {
        if (
          this.algIdsToOutputLength[algId] &&
          this.algIdsToOutputLength[algId].exp > now
        ) {
          // Use cached result
          return;
        }

        // Get hash algorithm corresponding to algId
        try {
          const hashAlgorithm = await (
            await this.ledgerService.getContract()
          ).getHashAlgorithmById(algId);

          const outputLength = hashAlgorithm.outputLength.toNumber();

          this.algIdsToOutputLength[algId] = {
            outputLength,
            exp: now + ALGORITHMS_EXP,
          };
        } catch (error) {
          throw new Error(`Can't find hash algorithm with ID: ${algId}`);
        }
      })
    );

    // Compare lengths
    hashValues.forEach((hashValue, index) => {
      const algId = hashAlgorithmIds[index];
      const expectedOutputLength =
        this.algIdsToOutputLength[algId].outputLength;
      const hashLength =
        Buffer.from(hashValue.replace("0x", ""), "hex").byteLength * 8;
      if (hashLength !== expectedOutputLength) {
        throw new Error(
          `Hash ${hashValue}'s length (${hashLength} bits) is different from the expected length (${expectedOutputLength} bits)`
        );
      }
    });
  }

  async verifyTransaction(param: SignedTransactionParam): Promise<{
    signer: string;
    functionName: string;
    args: ethers.utils.Result;
  }> {
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
        const castArgs = args as unknown as ArgsTimestampHashes;
        await validateClass(ArgsTimestampHashes, castArgs);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "timestampRecordHashes": {
        const castArgs = args as unknown as ArgsTimestampRecordHashes;
        await validateClass(ArgsTimestampRecordHashes, castArgs);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "timestampRecordVersionHashes": {
        const castArgs = args as unknown as ArgsTimestampRecordVersionHashes;
        await validateClass(ArgsTimestampRecordVersionHashes, castArgs);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "timestampVersionHashes": {
        const castArgs = args as unknown as ArgsTimestampVersionHashes;
        await validateClass(ArgsTimestampVersionHashes, castArgs);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "appendRecordVersionHashes": {
        const castArgs = args as unknown as ArgsAppendRecordVersionHashes;
        await validateClass(ArgsAppendRecordVersionHashes, castArgs);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
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
      args,
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

      const { from, outputLength, ianaName, oid, status, multihash } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertHashAlgorithm", [
        outputLength,
        ianaName ?? "",
        oid ?? "",
        status,
        multihash,
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

      const {
        from,
        hashAlgorithmId,
        outputLength,
        ianaName,
        oid,
        status,
        multihash,
      } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateHashAlgorithm", [
        hashAlgorithmId,
        outputLength,
        ianaName ?? "",
        oid ?? "",
        status,
        multihash,
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

      await this.checkHashes(hashAlgorithmIds, hashValues);

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

  async buildTransactionTimestampVersionHashes(
    body: RequestTimestampVersionHashesDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestTimestampVersionHashesDto, body);

      const {
        from,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionHash,
        versionInfo,
      } = body.params[0];

      await this.checkHashes(hashAlgorithmIds, hashValues);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("timestampVersionHashes", [
        versionHash,
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
        ownerId.toLowerCase(),
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
      ).interface.encodeFunctionData("revokeRecordOwner", [
        recordId,
        ownerId.toLowerCase(),
      ]);
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

      await this.checkHashes(hashAlgorithmIds, hashValues);

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

      await this.checkHashes(hashAlgorithmIds, hashValues);

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

      await this.checkHashes(hashAlgorithmIds, hashValues);

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
    body: RequestSendSignedTransactionDto,
    user: UserInfo,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0];
      const { signer, functionName, args } = await this.verifyTransaction(
        request
      );

      await this.checkWritePermission(functionName, signer, user, args);

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
