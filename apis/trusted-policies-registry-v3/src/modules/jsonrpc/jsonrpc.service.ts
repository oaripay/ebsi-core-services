import {
  decodeResult,
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  logAxiosError,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { isAxiosError } from "axios";
import { ethers } from "ethers";

import type { ApiConfig } from "../../config/configuration.js";

import { LedgerService } from "../ledger/ledger.service.js";
import {
  formatEthersSignature,
  formatEthersUnsignedTransaction,
} from "./jsonrpc.utils.js";
import {
  activatePolicySchema,
  deactivatePolicySchema,
  deleteUserAttributeSchema,
  insertPolicySchema,
  insertUserAttributesSchema,
  type JsonRpcSchema,
  requestActivatePolicyDtoSchema,
  requestDeactivatePolicyDtoSchema,
  requestDeleteUserAttributeDtoSchema,
  requestInsertPolicyDtoSchema,
  requestInsertUserAttributesDtoSchema,
  requestSendSignedTransactionDtoSchema,
  requestUpdatePolicyDtoSchema,
  type SendSignedTransactionParamsSchema,
  type UnsignedTransaction,
  updatePolicySchema,
} from "./validators/index.js";

@Injectable()
export class JsonRpcService {
  private chainId = "";

  private contractAddress: string;

  private didRegistry: string;

  private readonly logger = new Logger(JsonRpcService.name);

  private timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.didRegistry = configService.get<string>("didRegistryApiUrl");
    this.contractAddress = ledgerService.getContractAddress();
    this.timeout = configService.get<number>("requestTimeout");
  }

  async buildTransaction(
    from: string,
    params: string,
  ): Promise<UnsignedTransaction> {
    const nonceInt = await this.ledgerService
      .getEthersProvider()
      .getTransactionCount(from);

    const unsignedTransaction = {
      chainId: await this.getChainId(),
      data: params,
      from,
      gasLimit: "0x1000000",
      gasPrice: "0x0",
      nonce: `0x${BigInt(nonceInt).toString(16)}`,
      to: this.contractAddress,
      value: "0x0",
    } satisfies UnsignedTransaction;

    try {
      const gasEstimation = await this.estimateGas(unsignedTransaction);
      // Multiply by 1.4
      unsignedTransaction.gasLimit = `0x${((gasEstimation * 14n) / 10n).toString(16)}`;
    } catch {
      this.logger.warn("Gas could not be estimated. Using 0x1000000");
      unsignedTransaction.gasLimit = "0x1000000";
    }

    return unsignedTransaction;
  }

  async buildTransactionActivatePolicy(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestActivatePolicyDtoSchema.parseAsync(body);
      const { from, policyId, policyName } = parsedBody.params[0]!;

      let data: string;

      if (policyName) {
        data = this.ledgerService
          .getContract()
          .interface.encodeFunctionData("activatePolicy(string)", [policyName]);
      } else if (policyId) {
        data = this.ledgerService
          .getContract()
          .interface.encodeFunctionData("activatePolicy(uint256)", [policyId]);
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionDeactivatePolicy(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestDeactivatePolicyDtoSchema.parseAsync(body);
      const { from, policyId, policyName } = parsedBody.params[0]!;

      let data: string;

      if (policyName) {
        data = this.ledgerService
          .getContract()
          .interface.encodeFunctionData("deactivatePolicy(string)", [
            policyName,
          ]);
      } else if (policyId) {
        data = this.ledgerService
          .getContract()
          .interface.encodeFunctionData("deactivatePolicy(uint256)", [
            policyId,
          ]);
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionDeleteUserAttribute(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestDeleteUserAttributeDtoSchema.parseAsync(body);
      const { attribute, from, user } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("deleteUserAttribute", [user, attribute]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertPolicy(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestInsertPolicyDtoSchema.parseAsync(body);
      const { description, from, policyName } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("insertPolicy", [
          policyName,
          description,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertUserAttributes(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody =
        await requestInsertUserAttributesDtoSchema.parseAsync(body);
      const { attributes, from, user } = parsedBody.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData("insertUserAttributes", [
          user,
          attributes,
        ]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdatePolicy(
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<UnsignedTransaction> {
    try {
      const parsedBody = await requestUpdatePolicyDtoSchema.parseAsync(body);
      const { description, from, policyId, policyName } = parsedBody.params[0]!;

      let data: string;

      if (policyName) {
        data = this.ledgerService
          .getContract()
          .interface.encodeFunctionData("updatePolicy(string,string)", [
            policyName,
            description,
          ]);
      } else if (policyId) {
        data = this.ledgerService
          .getContract()
          .interface.encodeFunctionData("updatePolicy(uint256,string)", [
            policyId,
            description,
          ]);
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async checkDidOwnership(address: string, clientId: string): Promise<void> {
    // Check DID Registry
    if (!(await this.isDidControlledByAddress(clientId, address))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${address}`,
      );
    }
  }

  async estimateGas(transaction: UnsignedTransaction): Promise<bigint> {
    const { data, from, to, value } = transaction;

    try {
      return await this.ledgerService.getEthersProvider().estimateGas({
        data,
        from,
        to,
        value,
      });
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async getBlockNumber(): Promise<number> {
    try {
      return await this.ledgerService.getEthersProvider().getBlockNumber();
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      try {
        const { chainId } = await this.ledgerService
          .getEthersProvider()
          .getNetwork();
        this.chainId = `0x${BigInt(chainId).toString(16)}`;
      } catch (error) {
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new Error(getErrorMessage(error));
      }
    }
    return this.chainId;
  }

  async isDidControlledByAddress(
    did: string,
    controllerAddress: string,
  ): Promise<boolean> {
    const { data } = await axios.post<{
      error?: { message: string };
      result: boolean;
    }>(
      `${this.didRegistry}/identifiers/${did}/actions`,
      {
        jsonrpc: "2.0",
        method: "checkController",
        params: [controllerAddress],
      },
      { timeout: this.timeout, validateStatus: (s) => s >= 200 && s <= 400 },
    );

    if (data.error) {
      throw new Error(`The DID ${did} does not exist`);
    }

    return data.result;
  }

  async sendTransaction(
    clientId: string,
    body: JsonRpcSchema,
    id: null | number | string | undefined,
  ): Promise<string> {
    try {
      const chainId = await this.getChainId();

      const parsedBody =
        await requestSendSignedTransactionDtoSchema(chainId).parseAsync(body);

      const request = parsedBody.params[0]!;
      const { signer } = await this.verifyTransaction(request);

      await this.checkDidOwnership(signer, clientId);

      const tx = await this.ledgerService
        .getEthersProvider()
        .broadcastTransaction(request.signedRawTransaction);
      return tx.hash;
    } catch (error_) {
      if (isEthersError(error_)) {
        this.logger.error(error_, error_.stack); // Log the original error with all ethers.js details for internal debugging
        throw new InvalidRequestJsonRpcError(
          error_.error?.message ?? error_.shortMessage,
          id,
          undefined,
          error_.error &&
          "code" in error_.error &&
          typeof error_.error.code === "number"
            ? error_.error.code
            : undefined,
        );
      }

      if (error_ instanceof Error) {
        if (isAxiosError(error_)) {
          logAxiosError(error_, this.logger);
        } else {
          this.logger.error(error_.message, error_.stack);
        }

        const error = new InvalidRequestJsonRpcError(
          getErrorMessage(error_),
          id,
        );

        if (error_.stack) {
          error.stack = error_.stack;
        }

        throw error;
      }

      this.logger.error(error_);
      throw error_;
    }
  }

  async verifyTransaction(
    param: SendSignedTransactionParamsSchema,
  ): Promise<{ functionName: string; signer: string }> {
    const { r, s, signedRawTransaction, unsignedTransaction, v } = param;

    const unsignedTx = formatEthersUnsignedTransaction(unsignedTransaction);
    const signature = formatEthersSignature(r, s, v);

    // Serialize transaction with and without signature
    const unsignedSerializedTransaction =
      ethers.Transaction.from(unsignedTx).unsignedSerialized;
    const signedSerializedTransaction = ethers.Transaction.from({
      ...unsignedTx,
      signature,
    }).serialized;

    if (signedSerializedTransaction !== signedRawTransaction)
      throw new Error(
        `The unsigned transaction + signature (${signedSerializedTransaction}) does not match with the signedRawTransaction (${signedRawTransaction})`,
      );

    // recover address used to sign
    const digest = ethers.keccak256(unsignedSerializedTransaction);
    const signer = ethers.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase())
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `,
      );

    const chainId = await this.getChainId();
    if (unsignedTransaction.chainId !== chainId)
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`,
      );

    if (unsignedTransaction.to !== this.contractAddress)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`,
      );

    // verify function and parameters encoded in unsignedTransaction.data
    const parsedTransaction = this.ledgerService
      .getContract()
      .interface.parseTransaction(unsignedTransaction);

    if (!parsedTransaction) {
      throw new Error("Invalid unsignedTransaction.data");
    }

    const { args, fragment } = parsedTransaction;

    // Extract named args from args (args is a mixed array with named and unnamed values)
    const argsObject = {
      // @ts-expect-error Error due to CommonJS vs ESM modules imports
      ...decodeResult(args),
      from: unsignedTransaction.from,
    };

    switch (fragment.name) {
      case "activatePolicy": {
        await activatePolicySchema.parseAsync(argsObject);
        break;
      }
      case "deactivatePolicy": {
        await deactivatePolicySchema.parseAsync(argsObject);
        break;
      }
      case "deleteUserAttribute": {
        await deleteUserAttributeSchema.parseAsync(argsObject);
        break;
      }
      case "insertPolicy": {
        await insertPolicySchema.parseAsync(argsObject);
        break;
      }
      case "insertUserAttributes": {
        await insertUserAttributesSchema.parseAsync(argsObject);
        break;
      }
      case "updatePolicy": {
        await updatePolicySchema.parseAsync(argsObject);
        break;
      }
      default: {
        throw new Error(
          `The function name ${fragment.name} can not be used in this context`,
        );
      }
    }

    return {
      functionName: fragment.name,
      signer,
    };
  }
}

export default { JsonRpcService };
