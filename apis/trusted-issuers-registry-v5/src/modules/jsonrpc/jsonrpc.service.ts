import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import {
  getErrorMessage,
  logAxiosError,
  InvalidRequestJsonRpcError,
  isEthersError,
} from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import {
  RequestSetAttributeMetadataDto,
  RequestSetAttributeDataDto,
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  SignedTransactionParam,
  RequestAddIssuerProxyDto,
  ArgsAddIssuerProxy,
  ArgsUpdateIssuerProxy,
  ArgsSetAttributeMetadata,
  ArgsSetAttributeData,
} from "./dto/index.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils.js";
import type { ApiConfig } from "../../config/configuration.js";
import { RequestUpdateIssuerProxyDto } from "./dto/updateIssuerProxy/index.js";

function assertScopeContains(
  scope: string,
  validScopes: string | string[],
  methodName: string,
) {
  const scopeWithoutOpenid = scope.replace("openid ", "");
  const expectedScopes = Array.isArray(validScopes)
    ? validScopes
    : [validScopes];

  if (!expectedScopes.includes(scopeWithoutOpenid)) {
    throw new Error(
      `'${methodName}' requires an access token with the scope '${expectedScopes.join(
        "' or '",
      )}'`,
    );
  }
}

function assertDidMatchesSub(did: string, sub: string) {
  if (did !== sub) {
    throw new Error("Access token sub doesn't match the DID from the payload");
  }
}

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId?: string;

  private readonly didRegistryApiUrl: string;

  private readonly contractAddress: string;

  private readonly timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");
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
        this.logger.error(error);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async isDidControlledByAddress(
    did: string,
    controllerAddress: string,
  ): Promise<boolean> {
    try {
      const { data } = await axios.post<{
        result: boolean;
      }>(
        `${this.didRegistryApiUrl}/identifiers/${did}/actions`,
        {
          jsonrpc: "2.0",
          method: "checkController",
          params: [controllerAddress],
        },
        { timeout: this.timeout },
      );
      return data.result;
    } catch (err) {
      // Note: DIDR API v4 /identifiers/${did}/actions should always return 200, even if the response contains an error.
      // Reason: JSON-RPC response always use the status code 200. To be fixed.
      logAxiosError(err, this.logger);
      return false;
    }
  }

  async verifyTransaction(
    param: SignedTransactionParam,
    sub: string,
    scope: string,
  ): Promise<{ signer: string; functionName: string; args: unknown }> {
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

    switch (functionFragment.name) {
      case "setAttributeMetadata": {
        assertScopeContains(scope, "tir_write", functionFragment.name);
        const castArgs = args as unknown as ArgsSetAttributeMetadata;
        await validateClass(ArgsSetAttributeMetadata, castArgs);
        break;
      }
      case "setAttributeData": {
        assertScopeContains(
          scope,
          ["tir_invite", "tir_write"], // One of "tir_invite" or "tir_write"
          functionFragment.name,
        );
        const castArgs = args as unknown as ArgsSetAttributeData;
        await validateClass(ArgsSetAttributeData, castArgs);
        if (scope.includes("tir_invite")) {
          assertDidMatchesSub(castArgs.did, sub);
        }
        break;
      }
      case "addIssuerProxy": {
        assertScopeContains(scope, "tir_write", functionFragment.name);
        const castArgs = args as unknown as ArgsAddIssuerProxy;
        await validateClass(ArgsAddIssuerProxy, castArgs);
        break;
      }
      case "updateIssuerProxy": {
        assertScopeContains(scope, "tir_write", functionFragment.name);
        const castArgs = args as unknown as ArgsUpdateIssuerProxy;
        await validateClass(ArgsUpdateIssuerProxy, castArgs);
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

  async buildTransactionSetAttributeMetadata(
    body: RequestSetAttributeMetadataDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "setAttributeMetadata";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestSetAttributeMetadataDto, body);

      const { from, did, attributeId, issuerType, taoDid, taoAttributeId } =
        body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(method, [
        did,
        attributeId,
        issuerType,
        taoDid,
        taoAttributeId,
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

  async buildTransactionSetAttributeData(
    body: RequestSetAttributeDataDto,
    id: number | string | null | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "setAttributeData";

    try {
      assertScopeContains(scope, ["tir_invite", "tir_write"], method);

      await validateClass(RequestSetAttributeDataDto, body);

      const { from, did, attributeId, attributeData } = body.params[0]!;

      if (scope.includes("tir_invite")) {
        // Verify that the Access Token sub and the payload DID match
        assertDidMatchesSub(did, sub);
      }

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(method, [did, attributeId, attributeData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionAddIssuerProxy(
    body: RequestAddIssuerProxyDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "addIssuerProxy";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestAddIssuerProxyDto, body);

      const { from, did, proxyData } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(method, [did, proxyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateIssuerProxy(
    body: RequestUpdateIssuerProxyDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "updateIssuerProxy";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestUpdateIssuerProxyDto, body);

      const { from, did, proxyId, proxyData } = body.params[0]!;

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(method, [did, proxyId, proxyData]);

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
    sub: string,
    body: RequestSendSignedTransactionDto,
    id: number | string | null | undefined,
    scope: string,
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0]!;

      const { signer } = await this.verifyTransaction(request, sub, scope);

      if (!(await this.isDidControlledByAddress(sub, signer))) {
        throw new Error(
          `The DID ${sub} is not controlled by the address ${signer}`,
        );
      }

      const tx = await (
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);
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

export default JsonRpcService;
