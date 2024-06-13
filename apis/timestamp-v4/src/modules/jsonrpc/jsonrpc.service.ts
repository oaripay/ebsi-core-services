import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { BigNumber, ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  InvalidRequestJsonRpcError,
  isEthersError,
  getErrorMessage,
  logAxiosError,
} from "@ebsiint-api/shared";
// eslint-disable-next-line import/extensions
import { BigNumberish } from "@ethersproject/bignumber/lib/bignumber.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import { UserInfo } from "../auth/auth.interface.js";
import {
  appendRecordVersionHashesSchema,
  requestAppendRecordVersionHashesDtoSchema,
} from "./validators/RequestAppendRecordVersionHashes.js";
import {
  detachRecordVersionHashSchema,
  requestDetachRecordVersionHashDtoSchema,
} from "./validators/RequestDetachRecordVersionHashes.js";
import {
  insertHashAlgorithmSchema,
  requestInsertHashAlgorithmDtoSchema,
} from "./validators/RequestInsertHashAlgorithm.js";
import {
  insertRecordOwnerSchema,
  requestInsertRecordOwnerDtoSchema,
} from "./validators/RequestInsertRecordOwner.js";
import {
  insertRecordVersionInfoSchema,
  requestInsertRecordVersionInfoDtoSchema,
} from "./validators/RequestInsertRecordVersionInfo.js";
import {
  revokeRecordOwnerSchema,
  requestRevokeRecordOwnerDtoSchema,
} from "./validators/RequestRevokeRecordOwner.js";
import {
  timestampHashesSchema,
  requestTimestampHashesDtoSchema,
} from "./validators/RequestTimestampHashes.js";
import {
  timestampRecordHashesSchema,
  requestTimestampRecordHashesDtoSchema,
} from "./validators/RequestTimestampRecordHashes.js";
import {
  timestampRecordVersionHashesSchema,
  requestTimestampRecordVersionHashesDtoSchema,
} from "./validators/RequestTimestampRecordVersionHashes.js";
import {
  timestampVersionHashesSchema,
  requestTimestampVersionHashesDtoSchema,
} from "./validators/RequestTimestampVersionHashes.js";
import {
  updateHashAlgorithmSchema,
  requestUpdateHashAlgorithmDtoSchema,
} from "./validators/RequestUpdateHashAlgorithm.js";
import {
  requestSendSignedTransactionDtoSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
} from "./validators/RequestSendSignedTransaction.js";
import { JsonRpcSchema } from "./validators/JsonRpcSchema.js";

// Cache algorithms' output lengths for 30 minutes
const ALGORITHMS_EXP = 30 * 60 * 1000; // 30 minutes

/**
 * Extract named attributes from a mixed array (array with named keys and number keys) as returned by ethers.js parseTransaction
 */
function extractNamedAttributes(mixedArray: unknown): Record<string, unknown> {
  if (
    !mixedArray ||
    typeof mixedArray !== "object" ||
    !Array.isArray(mixedArray)
  ) {
    throw new Error("Not a mixed array");
  }

  const keys = Object.keys(mixedArray).filter((key) =>
    Number.isNaN(parseInt(key, 10)),
  );

  return keys.reduce((obj, key) => {
    // @ts-expect-error Element implicitly has an 'any' type because index expression is not of type 'number'.ts(7015)
    const value: unknown = mixedArray[key];
    return { ...obj, [key]: value };
  }, {});
}

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private didRegistry: string;

  private chainId = "";

  private contractAddress: string;

  private algIdsToOutputLength: Record<
    number,
    { outputLength: number; exp: number }
  > = {};

  private timeout: number;

  constructor(
    private configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.didRegistry = this.configService.get<string>("didRegistryApiUrl");
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
          this.logger.error(error, error.stack);
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
        this.logger.error(error, error.stack);
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

  async checkHashes(
    hashAlgorithmIds: BigNumberish[],
    hashValues: string[],
  ): Promise<void> {
    if (hashAlgorithmIds.length !== hashValues.length) {
      throw new Error(
        "hashAlgorithmIds and hashValues don't have the same length",
      );
    }

    const now = Date.now();
    const uniqHashAlgorithmIds = [...new Set(hashAlgorithmIds)];

    await Promise.all(
      uniqHashAlgorithmIds.map(async (algId) => {
        if (
          this.algIdsToOutputLength[BigNumber.from(algId).toNumber()] &&
          this.algIdsToOutputLength[BigNumber.from(algId).toNumber()]!.exp > now
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

          this.algIdsToOutputLength[BigNumber.from(algId).toNumber()] = {
            outputLength,
            exp: now + ALGORITHMS_EXP,
          };
        } catch (error) {
          if (isEthersError(error)) {
            this.logger.error(error, error.stack);
          }
          throw new Error(
            `Can't find hash algorithm with ID: ${BigNumber.from(
              algId,
            ).toNumber()}`,
          );
        }
      }),
    );

    // Compare lengths
    hashValues.forEach((hashValue, index) => {
      const algId = hashAlgorithmIds[index]!;
      const expectedOutputLength =
        this.algIdsToOutputLength[BigNumber.from(algId).toNumber()]!
          .outputLength;
      const hashLength =
        Buffer.from(hashValue.replace("0x", ""), "hex").byteLength * 8;
      if (hashLength !== expectedOutputLength) {
        throw new Error(
          `Hash ${hashValue}'s length (${hashLength} bits) is different from the expected length (${expectedOutputLength} bits)`,
        );
      }
    });
  }

  async verifyTransaction(param: SendSignedTransactionParamsSchema): Promise<{
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
      signature,
    );

    if (serializedTransactionSigned !== signedRawTransaction) {
      throw new Error(
        `The unsigned transaction + signature (${serializedTransactionSigned}) does not match with the signedRawTransaction (${signedRawTransaction})`,
      );
    }

    // recover address used to sign
    const digest = ethers.utils.keccak256(serializedTransaction);
    const signer = ethers.utils.recoverAddress(digest, signature).toLowerCase();

    if (signer !== unsignedTransaction.from.toLowerCase()) {
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `,
      );
    }

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

    // Extract named args from args (args is a mixed array with named and unnamed values)
    const argsObject = {
      ...extractNamedAttributes(args),
      from: unsignedTransaction.from,
    };

    switch (functionFragment.name) {
      case "insertHashAlgorithm": {
        await insertHashAlgorithmSchema.parseAsync(argsObject);
        break;
      }
      case "updateHashAlgorithm": {
        await updateHashAlgorithmSchema.parseAsync(argsObject);
        break;
      }
      case "timestampHashes": {
        const castArgs = await timestampHashesSchema.parseAsync(argsObject);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "timestampRecordHashes": {
        const castArgs =
          await timestampRecordHashesSchema.parseAsync(argsObject);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "timestampRecordVersionHashes": {
        const castArgs =
          await timestampRecordVersionHashesSchema.parseAsync(argsObject);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "timestampVersionHashes": {
        const castArgs =
          await timestampVersionHashesSchema.parseAsync(argsObject);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "appendRecordVersionHashes": {
        const castArgs =
          await appendRecordVersionHashesSchema.parseAsync(argsObject);
        await this.checkHashes(castArgs.hashAlgorithmIds, castArgs.hashValues);
        break;
      }
      case "insertRecordOwner": {
        await insertRecordOwnerSchema.parseAsync(argsObject);
        break;
      }
      case "revokeRecordOwner": {
        await revokeRecordOwnerSchema.parseAsync(argsObject);
        break;
      }
      case "insertRecordVersionInfo": {
        await insertRecordVersionInfoSchema.parseAsync(argsObject);
        break;
      }
      case "detachRecordVersionHash": {
        await detachRecordVersionHashSchema.parseAsync(argsObject);
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
      unsignedTransaction.gasLimit = ethers.BigNumber.from(
        Math.ceil(1.4 * Number(gasEstimation)),
      ).toHexString();
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

  async buildTransactionInsertHashAlgorithm(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestInsertHashAlgorithmDtoSchema.parseAsync(body);

      const { from, outputLength, ianaName, oid, status, multiHash } =
        parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertHashAlgorithm", [
        outputLength,
        ianaName ?? "",
        oid ?? "",
        status,
        multiHash,
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

  async buildTransactionUpdateHashAlgorithm(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestUpdateHashAlgorithmDtoSchema.parseAsync(body);

      const {
        from,
        hashAlgorithmId,
        outputLength,
        ianaName,
        oid,
        status,
        multiHash,
      } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateHashAlgorithm", [
        hashAlgorithmId,
        outputLength,
        ianaName ?? "",
        oid ?? "",
        status,
        multiHash,
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

  async buildTransactionTimestampHashes(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestTimestampHashesDtoSchema.parseAsync(body);

      const { from, hashAlgorithmIds, hashValues, timestampData } =
        parsedBody.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionTimestampVersionHashes(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestTimestampVersionHashesDtoSchema.parseAsync(body);

      const {
        from,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionHash,
        versionInfo,
      } = parsedBody.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertRecordOwner(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestInsertRecordOwnerDtoSchema.parseAsync(body);

      const { from, recordId, ownerId, notBefore, notAfter } =
        parsedBody.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionRevokeRecordOwner(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestRevokeRecordOwnerDtoSchema.parseAsync(body);

      const { from, recordId, ownerId } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeRecordOwner", [
        recordId,
        ownerId.toLowerCase(),
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

  async buildTransactionInsertRecordVersionInfo(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestInsertRecordVersionInfoDtoSchema.parseAsync(body);

      const { from, recordId, versionId, versionInfo } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertRecordVersionInfo", [
        recordId,
        versionId,
        versionInfo,
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

  async buildTransactionDetachRecordVersionHash(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestDetachRecordVersionHashDtoSchema.parseAsync(body);

      const { from, recordId, versionId, hashValue } = parsedBody.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("detachRecordVersionHash", [
        recordId,
        versionId,
        hashValue,
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

  async buildTransactionTimestampRecordHashes(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestTimestampRecordHashesDtoSchema.parseAsync(body);

      const { from, hashAlgorithmIds, hashValues, timestampData, versionInfo } =
        parsedBody.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionTimestampRecordVersionHashes(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestTimestampRecordVersionHashesDtoSchema.parseAsync(body);

      const {
        from,
        recordId,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionInfo,
      } = parsedBody.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAppendRecordVersionHashes(
    body: JsonRpcSchema,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestAppendRecordVersionHashesDtoSchema.parseAsync(body);

      const {
        from,
        recordId,
        versionId,
        hashAlgorithmIds,
        hashValues,
        timestampData,
        versionInfo,
      } = parsedBody.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async verifyEthereumAddress(address: string, user: UserInfo): Promise<void> {
    if (!(await this.isDidControlledByAddress(user.sub, address))) {
      throw new Error(
        `The DID ${user.sub} is not controlled by the address ${address}`,
      );
    }
  }

  async sendTransaction(
    body: JsonRpcSchema,
    user: UserInfo,
    id?: number | string,
  ): Promise<string> {
    try {
      const parsedBody =
        await requestSendSignedTransactionDtoSchema.parseAsync(body);

      const request = parsedBody.params[0]!;
      const { signer } = await this.verifyTransaction(request);

      await this.verifyEthereumAddress(signer, user);

      const tx = await (
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);
      return tx.hash;
    } catch (err) {
      if (isEthersError(err)) {
        this.logger.error(err, err.stack); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(err.reason, id); // throw simplified ethers error to the user
      }

      if (err instanceof Error) {
        if (axios.isAxiosError(err)) {
          logAxiosError(err, this.logger);
        } else {
          this.logger.error(err.message, err.stack);
        }

        const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);

        if (err.stack) {
          error.stack = err.stack;
        }

        throw error;
      }

      this.logger.error(err);
      throw err;
    }
  }
}

export default { JsonRpcService };
