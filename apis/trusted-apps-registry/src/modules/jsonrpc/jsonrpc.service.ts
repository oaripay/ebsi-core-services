import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
} from "@ebsiint-api/shared";
import { Tar } from "@ebsiint-sc/trusted-apps-registry";
import {
  RequestDeleteAppAdministratorDto,
  RequestInsertAppDto,
  RequestInsertAppAdministratorDto,
  RequestInsertAppInfoDto,
  RequestSendSignedTransactionDto,
  RequestUpdateAppDto,
  RequestInsertRevocationDto,
  RequestInsertAppPublicKeyDto,
  RequestUpdateAppPublicKeyDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestInsertAuthorizationDto,
  RequestUpdateAuthorizationDto,
  UnsignedTransaction,
  ArgsDeleteAppAdministrator,
  ArgsInsertApp,
  ArgsInsertAppAdministrator,
  ArgsInsertAppInfo,
  ArgsUpdateApp,
  ArgsInsertRevocation,
  ArgsInsertAppPublicKey,
  ArgsUpdateAppPublicKey,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  ArgsInsertAuthorization,
  ArgsUpdateAuthorization,
  SignedTransactionParam,
} from "./dto/index.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils.js";
import LedgerService from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private tarContract: Tar;

  private chainId = "";

  private didRegistry: string;

  private timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.tarContract = this.ledgerService.getContract();
    this.didRegistry = configService.get<string>("didRegistryApiUrl");
    this.timeout = configService.get<number>("requestTimeout");
  }

  async getChainId(): Promise<string> {
    if (!this.chainId) {
      try {
        const { chainId } = await this.tarContract.provider.getNetwork();
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
      return await this.tarContract.provider.estimateGas({
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

  async checkWritePermission(address: string, clientId: string): Promise<void> {
    // Check DID Registry
    if (!(await this.isDidControlledByAddress(clientId, address))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${address}`,
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

    if (unsignedTransaction.to !== this.tarContract.address)
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.tarContract.address}. Received ${unsignedTransaction.to}`,
      );

    // verify function and parameters encoded in unsignedTransaction.data
    const { args, functionFragment } =
      this.tarContract.interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "deleteAppAdministrator": {
        await validateClass(
          ArgsDeleteAppAdministrator,
          args as unknown as ArgsDeleteAppAdministrator,
        );
        break;
      }
      case "insertApp": {
        await validateClass(ArgsInsertApp, args as unknown as ArgsInsertApp);
        break;
      }
      case "insertAppAdministrator": {
        await validateClass(
          ArgsInsertAppAdministrator,
          args as unknown as ArgsInsertAppAdministrator,
        );
        break;
      }
      case "insertAppInfo": {
        await validateClass(
          ArgsInsertAppInfo,
          args as unknown as ArgsInsertAppInfo,
        );
        break;
      }
      case "updateApp": {
        await validateClass(ArgsUpdateApp, args as unknown as ArgsUpdateApp);
        break;
      }
      case "insertRevocation": {
        await validateClass(
          ArgsInsertRevocation,
          args as unknown as ArgsInsertRevocation,
        );
        break;
      }
      case "insertPolicy": {
        await validateClass(
          ArgsInsertPolicy,
          args as unknown as ArgsInsertPolicy,
        );
        break;
      }
      case "insertAppPublicKey": {
        await validateClass(
          ArgsInsertAppPublicKey,
          args as unknown as ArgsInsertAppPublicKey,
        );
        break;
      }
      case "updateAppPublicKey": {
        await validateClass(
          ArgsUpdateAppPublicKey,
          args as unknown as ArgsUpdateAppPublicKey,
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
      case "insertAuthorization": {
        await validateClass(
          ArgsInsertAuthorization,
          args as unknown as ArgsInsertAuthorization,
        );
        break;
      }
      case "updateAuthorization": {
        await validateClass(
          ArgsUpdateAuthorization,
          args as unknown as ArgsUpdateAuthorization,
        );
        break;
      }
      default:
        throw new Error(
          `The function name ${functionFragment.name} can not be used in this context`,
        );
    }

    return signer;
  }

  async buildTransaction(
    from: string,
    params: string,
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

  async buildTransactionDeleteAppAdministrator(
    body: RequestDeleteAppAdministratorDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDeleteAppAdministratorDto, body);

      const { from, applicationId, administratorId } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "deleteAppAdministrator",
        [applicationId, administratorId],
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertApp(
    body: RequestInsertAppDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppDto, body);

      const { from, name, domain, appAdministrator } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData("insertApp", [
        name,
        domain,
        appAdministrator,
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

  async buildTransactionInsertAppAdministrator(
    body: RequestInsertAppAdministratorDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppAdministratorDto, body);

      const { from, applicationId, administratorId } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAppAdministrator",
        [applicationId, administratorId],
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertAppInfo(
    body: RequestInsertAppInfoDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppInfoDto, body);

      const { from, applicationId, info } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAppInfo",
        [applicationId, info],
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertRevocation(
    body: RequestInsertRevocationDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertRevocationDto, body);

      const { from, applicationId, revokedBy, notBefore } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "insertRevocation",
        [applicationId, revokedBy, notBefore],
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateApp(
    body: RequestUpdateAppDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAppDto, body);

      const { from, applicationId, domain } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData("updateApp", [
        applicationId,
        domain,
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

  async buildTransactionInsertAppPublicKey(
    body: RequestInsertAppPublicKeyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAppPublicKeyDto, body);

      const { from, applicationId, publicKey, status, notBefore, notAfter } =
        body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAppPublicKey",
        [applicationId, publicKey, status, notBefore, notAfter],
      );
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateAppPublicKey(
    body: RequestUpdateAppPublicKeyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAppPublicKeyDto, body);

      const { from, publicKeyId, status, notAfter } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "updateAppPublicKey",
        [publicKeyId, status, notAfter],
      );
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertPolicy(
    body: RequestInsertPolicyDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertPolicyDto, body);
      const { from, policyId, policyData } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "insertPolicy",
        [policyId, policyData],
      );
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
      const { from, policyId, policyData } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "updatePolicy",
        [policyId, policyData],
      );
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertAuthorization(
    body: RequestInsertAuthorizationDto,
    id?: number | string,
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
      } = body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "insertAuthorization",
        [
          name,
          authorizedAppName,
          iss,
          status,
          permissions,
          notBefore,
          notAfter,
        ],
      );

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateAuthorization(
    body: RequestUpdateAuthorizationDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAuthorizationDto, body);

      const { from, authorizationId, status, permissions, notAfter } =
        body.params[0]!;

      const data = this.tarContract.interface.encodeFunctionData(
        "updateAuthorization",
        [authorizationId, status, permissions, notAfter],
      );

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
      const signer = await this.verifyTransaction(request);

      await this.checkWritePermission(signer, clientId);

      const tx = await this.tarContract.provider.sendTransaction(
        request.signedRawTransaction,
      );

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

export default { JsonRpcService };
