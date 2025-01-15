import {
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
  logAxiosError,
  prefixWith0x,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { isAxiosError } from "axios";
import { ethers } from "ethers";

import type { ApiConfig } from "../../config/configuration.js";

import { LedgerService } from "../ledger/ledger.service.js";
import {
  ArgsAddIssuerProxy,
  ArgsInsertIssuer,
  ArgsSetAttributeData,
  ArgsSetAttributeMetadata,
  ArgsUpdateIssuer,
  ArgsUpdateIssuerProxy,
  RequestAddIssuerProxyDto,
  RequestInsertIssuerDto,
  RequestSendSignedTransactionDto,
  RequestSetAttributeDataDto,
  RequestSetAttributeMetadataDto,
  RequestUpdateIssuerDto,
  SignedTransactionParam,
  UnsignedTransaction,
} from "./dto/index.js";
import { RequestUpdateIssuerProxyDto } from "./dto/updateIssuerProxy/index.js";
import {
  formatEthersSignature,
  formatEthersUnsignedTransaction,
  validateClass,
} from "./jsonrpc.utils.js";

function assertDidMatchesSub(did: string, sub: string) {
  if (did !== sub) {
    throw new Error("Access token sub doesn't match the DID from the payload");
  }
}

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

@Injectable()
export class JsonRpcService {
  private chainId?: string;

  private readonly contractAddress: string;

  private readonly didRegistryApiUrl: string;

  private readonly logger = new Logger(JsonRpcService.name);

  private readonly timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    this.didRegistryApiUrl = configService.get("didRegistryApiUrl", {
      infer: true,
    });
    this.contractAddress = ledgerService.getContractAddress();
    this.timeout = configService.get("requestTimeout", { infer: true });
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

    let gasEstimation: bigint | string = "unset";

    try {
      gasEstimation = await this.estimateGas(unsignedTransaction);

      // Multiply by 1.4
      unsignedTransaction.gasLimit = `0x${((gasEstimation * 14n) / 10n).toString(16)}`;
    } catch {
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

  async buildTransactionAddIssuerProxy(
    body: RequestAddIssuerProxyDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "addIssuerProxy";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestAddIssuerProxyDto, body);

      const { did, from, proxyData } = body.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData(method, [did, proxyData]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertIssuer(
    body: RequestInsertIssuerDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "insertIssuer";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestInsertIssuerDto, body);

      const { attributeData, did, from, issuerType, taoAttributeId, taoDid } =
        body.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData(method, [
          did,
          attributeData,
          issuerType,
          taoDid,
          taoAttributeId,
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

  async buildTransactionSetAttributeData(
    body: RequestSetAttributeDataDto,
    id: null | number | string | undefined,
    sub: string,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "setAttributeData";

    try {
      assertScopeContains(scope, ["tir_invite", "tir_write"], method);

      await validateClass(RequestSetAttributeDataDto, body);

      const { attributeData, attributeId, did, from } = body.params[0]!;

      if (scope.includes("tir_invite")) {
        // Verify that the Access Token sub and the payload DID match
        assertDidMatchesSub(did, sub);
      }

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData(method, [
          did,
          attributeId,
          attributeData,
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

  async buildTransactionSetAttributeMetadata(
    body: RequestSetAttributeMetadataDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "setAttributeMetadata";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestSetAttributeMetadataDto, body);

      const { attributeId, did, from, issuerType, taoAttributeId, taoDid } =
        body.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData(method, [
          did,
          attributeId,
          issuerType,
          taoDid,
          taoAttributeId,
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

  async buildTransactionUpdateIssuer(
    body: RequestUpdateIssuerDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "updateIssuer";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestUpdateIssuerDto, body);

      const {
        attributeData,
        did,
        from,
        issuerType,
        prevAttributeHash,
        taoAttributeId,
        taoDid,
      } = body.params[0]!;

      const data: (number | string)[] = [did, attributeData];

      if (prevAttributeHash) {
        data.push(prefixWith0x(prevAttributeHash));
      }

      data.push(issuerType, taoDid, taoAttributeId);

      const functionSig = prevAttributeHash
        ? // using updateIssuer to update an existing attribute
          "updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"
        : // using updateIssuer to add a new attribute
          "updateIssuer(string,bytes,uint8,string,bytes32)";

      const encodedData = this.ledgerService
        .getContract()
        .interface.encodeFunctionData(
          // @ts-expect-error No overload matches this call.
          functionSig,
          data,
        );

      return await this.buildTransaction(from, encodedData);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateIssuerProxy(
    body: RequestUpdateIssuerProxyDto,
    id: null | number | string | undefined,
    scope: string,
  ): Promise<UnsignedTransaction> {
    const method = "updateIssuerProxy";

    try {
      assertScopeContains(scope, "tir_write", method);

      await validateClass(RequestUpdateIssuerProxyDto, body);

      const { did, from, proxyData, proxyId } = body.params[0]!;

      const data = this.ledgerService
        .getContract()
        .interface.encodeFunctionData(method, [did, proxyId, proxyData]);

      return await this.buildTransaction(from, data);
    } catch (error_) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(error_), id);
      if (error_ instanceof Error && error_.stack) {
        error.stack = error_.stack;
      }
      throw error;
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
      `${this.didRegistryApiUrl}/identifiers/${did}/actions`,
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
    sub: string,
    body: RequestSendSignedTransactionDto,
    id: null | number | string | undefined,
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
    param: SignedTransactionParam,
    sub: string,
    scope: string,
  ): Promise<{ args: unknown; functionName: string; signer: string }> {
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
    const parsedTransaction = this.ledgerService
      .getContract()
      .interface.parseTransaction(unsignedTransaction);

    if (!parsedTransaction) {
      throw new Error("Invalid unsignedTransaction.data");
    }

    const { args, fragment } = parsedTransaction;

    switch (fragment.name) {
      case "addIssuerProxy": {
        assertScopeContains(scope, "tir_write", fragment.name);
        const castArgs = args as unknown as ArgsAddIssuerProxy;
        await validateClass(ArgsAddIssuerProxy, castArgs);
        break;
      }
      case "insertIssuer": {
        assertScopeContains(scope, "tir_write", fragment.name);
        const castArgs = args as unknown as ArgsInsertIssuer;
        await validateClass(ArgsInsertIssuer, castArgs);
        break;
      }
      case "setAttributeData": {
        assertScopeContains(
          scope,
          ["tir_invite", "tir_write"], // One of "tir_invite" or "tir_write"
          fragment.name,
        );
        const castArgs = args as unknown as ArgsSetAttributeData;
        await validateClass(ArgsSetAttributeData, castArgs);
        if (scope.includes("tir_invite")) {
          assertDidMatchesSub(castArgs.did, sub);
        }
        break;
      }
      case "setAttributeMetadata": {
        assertScopeContains(scope, "tir_write", fragment.name);
        const castArgs = args as unknown as ArgsSetAttributeMetadata;
        await validateClass(ArgsSetAttributeMetadata, castArgs);
        break;
      }
      case "updateIssuer": {
        assertScopeContains(scope, "tir_write", fragment.name);
        const castArgs = args as unknown as ArgsUpdateIssuer;
        await validateClass(ArgsUpdateIssuer, castArgs);
        break;
      }
      case "updateIssuerProxy": {
        assertScopeContains(scope, "tir_write", fragment.name);
        const castArgs = args as unknown as ArgsUpdateIssuerProxy;
        await validateClass(ArgsUpdateIssuerProxy, castArgs);
        break;
      }
      default: {
        throw new Error(
          `The function name ${fragment.name} can not be used in this context`,
        );
      }
    }

    return {
      args,
      functionName: fragment.name,
      signer,
    };
  }
}

export default JsonRpcService;
