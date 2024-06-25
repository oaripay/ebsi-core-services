import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  logAxiosError,
} from "@ebsiint-api/shared";
import {
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestAddPolicyConditionsDto,
  RequestDeletePolicyConditionDto,
  RequestActivatePolicyDto,
  RequestDeactivatePolicyDto,
  RequestInsertUserAttributesDto,
  RequestUpdateUserAttributeDto,
  RequestDeleteUserAttributeDto,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  ArgsAddPolicyConditions,
  ArgsDeletePolicyCondition,
  ArgsActivatePolicy,
  ArgsDeactivatePolicy,
  ArgsInsertUserAttributes,
  ArgsUpdateUserAttribute,
  ArgsDeleteUserAttribute,
  UnsignedTransaction,
  SignedTransactionParam,
  RequestSendSignedTransactionDto,
} from "./dto/index.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";

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
          this.logger.error(error, error.stack);
        }
        throw new Error(getErrorMessage(error));
      }
    }
    return this.chainId;
  }

  async getBlockNumber(): Promise<number> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).provider.getBlockNumber();
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async estimateGas(
    transaction: UnsignedTransaction,
  ): Promise<ethers.BigNumber> {
    const { from, to, data, value } = transaction;

    try {
      return await (
        await this.ledgerService.getContract()
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
      error?: { message: string };
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

  async checkDidOwnership(address: string, clientId: string): Promise<void> {
    // Check DID Registry
    if (!(await this.isDidControlledByAddress(clientId, address))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${address}`,
      );
    }
  }

  async verifyTransaction(
    param: SignedTransactionParam,
  ): Promise<{ signer: string; functionName: string }> {
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
    if (unsignedTransaction.chainId !== chainId)
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`,
      );

    if (unsignedTransaction.to !== this.contractAddress)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`,
      );

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
      case "addPolicyConditions": {
        await validateClass(
          ArgsAddPolicyConditions,
          args as unknown as ArgsAddPolicyConditions,
        );
        break;
      }
      case "deletePolicyCondition": {
        await validateClass(
          ArgsDeletePolicyCondition,
          args as unknown as ArgsDeletePolicyCondition,
        );
        break;
      }
      case "activatePolicy": {
        await validateClass(
          ArgsActivatePolicy,
          args as unknown as ArgsActivatePolicy,
        );
        break;
      }
      case "deactivatePolicy": {
        await validateClass(
          ArgsDeactivatePolicy,
          args as unknown as ArgsDeactivatePolicy,
        );
        break;
      }
      case "insertUserAttributes": {
        await validateClass(
          ArgsInsertUserAttributes,
          args as unknown as ArgsInsertUserAttributes,
        );
        break;
      }
      case "updateUserAttribute": {
        await validateClass(
          ArgsUpdateUserAttribute,
          args as unknown as ArgsUpdateUserAttribute,
        );
        break;
      }
      case "deleteUserAttribute": {
        await validateClass(
          ArgsDeleteUserAttribute,
          args as unknown as ArgsDeleteUserAttribute,
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
      const { from, opType, policyConditions, policyName, description } =
        body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertPolicy", [
        opType,
        policyConditions,
        policyName,
        description,
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

  async buildTransactionUpdatePolicy(
    body: RequestUpdatePolicyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdatePolicyDto, body);
      const { from, policyId, opType, policyName, description } =
        body.params[0]!;

      let data: string;

      if (policyName) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData("updatePolicy(string,uint8,string)", [
          policyName,
          opType,
          description,
        ]);
      } else if (policyId) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData("updatePolicy(uint256,uint8,string)", [
          policyId,
          opType,
          description,
        ]);
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddPolicyConditions(
    body: RequestAddPolicyConditionsDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAddPolicyConditionsDto, body);
      const { from, policyId, policyName, policyConditions } = body.params[0]!;

      let data: string;

      if (policyName) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData(
          "addPolicyConditions(string,(string,string,uint8,bytes,uint8)[])",
          [policyName, policyConditions],
        );
      } else if (policyId) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData(
          "addPolicyConditions(uint256,(string,string,uint8,bytes,uint8)[])",
          [policyId, policyConditions],
        );
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionDeletePolicyCondition(
    body: RequestDeletePolicyConditionDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDeletePolicyConditionDto, body);
      const { from, policyId, policyName, policyConditionId } = body.params[0]!;

      let data: string;

      if (policyName) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData(
          "deletePolicyCondition(string,uint256)",
          [policyName, policyConditionId],
        );
      } else if (policyId) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData(
          "deletePolicyCondition(uint256,uint256)",
          [policyId, policyConditionId],
        );
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionActivatePolicy(
    body: RequestActivatePolicyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestActivatePolicyDto, body);
      const { from, policyId, policyName } = body.params[0]!;

      let data: string;

      if (policyName) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData("activatePolicy(string)", [policyName]);
      } else if (policyId) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData("activatePolicy(uint256)", [policyId]);
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionDeactivatePolicy(
    body: RequestDeactivatePolicyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDeactivatePolicyDto, body);
      const { from, policyId, policyName } = body.params[0]!;

      let data: string;

      if (policyName) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData("deactivatePolicy(string)", [
          policyName,
        ]);
      } else if (policyId) {
        data = (
          await this.ledgerService.getContract()
        ).interface.encodeFunctionData("deactivatePolicy(uint256)", [policyId]);
      } else {
        throw new Error("Either policyId or policyName must be provided");
      }

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertUserAttributes(
    body: RequestInsertUserAttributesDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertUserAttributesDto, body);
      const { from, address, attributeNames, attributeValues } =
        body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertUserAttributes", [
        address,
        attributeNames,
        attributeValues,
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

  async buildTransactionUpdateUserAttribute(
    body: RequestUpdateUserAttributeDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateUserAttributeDto, body);
      const { from, address, attributeName, attributeValue } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateUserAttribute", [
        address,
        attributeName,
        attributeValue,
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

  async buildTransactionDeleteUserAttribute(
    body: RequestDeleteUserAttributeDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDeleteUserAttributeDto, body);
      const { from, address, attributeName } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("deleteUserAttribute", [
        address,
        attributeName,
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

      await this.checkDidOwnership(signer, clientId);

      const tx = await (
        await this.ledgerService.getContract()
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
