import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import { ProblemDetailsError, prefixWith0x } from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service";
import {
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSendSignedTransactionDto,
  UnsignedTransaction,
  SignedTransactionParam,
  ArgsInsertIssuer,
  ArgsUpdateIssuer,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
  RequestAddIssuerProxyDto,
  ArgsAddIssuerProxy,
  ArgsUpdateIssuerProxy,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils";
import { ApiConfig } from "../../config/configuration";
import { RequestUpdateIssuerProxyDto } from "./dto/updateIssuerProxy";

function getErrorMessage(error: unknown) {
  if (error instanceof ProblemDetailsError && error.detail) {
    return error.detail;
  }
  return (error as Error).message;
}

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId: string = null;

  private didRegistry: string;

  private contractAddress: string;

  private timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService
  ) {
    this.didRegistry = configService.get<string>("didRegistryApiUrl");
    this.contractAddress = ledgerService.getContractAddress();
    this.timeout = configService.get<number>("requestTimeout");
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

    return (
      await this.ledgerService.getContract({ protectedMethod: true })
    ).provider.estimateGas({
      from,
      to,
      data,
      value,
    });
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
      `${this.didRegistry}/identifiers?controller=${controllerAddress}&page[size]=${pageSize}&page[after]=${currentPage}`,
      { timeout: this.timeout }
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

  async verifyTransaction(
    param: SignedTransactionParam
  ): Promise<{ signer: string; functionName: string; args: unknown }> {
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
    const signer = ethers.utils.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase())
      throw new Error(
        `The signer of the transaction (${signer}) does not match with unsignedTransaction.from (${unsignedTransaction.from}) `
      );

    const chainId = await this.getChainId();
    if (unsignedTransaction.chainId !== chainId) {
      throw new Error(
        `Invalid unsignedTransaction.chainId. Expected ${chainId}. Received ${unsignedTransaction.chainId}`
      );
    }

    if (unsignedTransaction.to !== this.contractAddress) {
      throw new Error(
        `Invalid unsignedTransaction.to. Expected ${this.contractAddress}. Received ${unsignedTransaction.to}`
      );
    }

    // verify function and parameters encoded in unsignedTransaction.data
    const { args, functionFragment } = (
      await this.ledgerService.getContract()
    ).interface.parseTransaction(unsignedTransaction);

    switch (functionFragment.name) {
      case "insertIssuer": {
        await validateClass(
          ArgsInsertIssuer,
          args as unknown as ArgsInsertIssuer
        );
        break;
      }
      case "updateIssuer": {
        await validateClass(
          ArgsUpdateIssuer,
          args as unknown as ArgsUpdateIssuer
        );
        break;
      }
      case "insertPolicy": {
        await validateClass(
          ArgsInsertPolicy,
          args as unknown as ArgsInsertPolicy
        );
        break;
      }
      case "updatePolicy": {
        await validateClass(
          ArgsUpdatePolicy,
          args as unknown as ArgsUpdatePolicy
        );
        break;
      }
      case "addIssuerProxy": {
        await validateClass(
          ArgsAddIssuerProxy,
          args as unknown as ArgsAddIssuerProxy
        );
        break;
      }
      case "updateIssuerProxy": {
        await validateClass(
          ArgsUpdateIssuerProxy,
          args as unknown as ArgsUpdateIssuerProxy
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
        } Using 0x1000000`
      );
      unsignedTransaction.gasLimit = "0x1000000";
    }

    return unsignedTransaction;
  }

  async buildTransactionInsertIssuer(
    body: RequestInsertIssuerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertIssuerDto, body);

      const { from, did, attributeData, issuerType, taoDid, taoAttributeId } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertIssuer", [
        did,
        attributeData,
        issuerType,
        taoDid,
        taoAttributeId,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateIssuer(
    body: RequestUpdateIssuerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateIssuerDto, body);

      const {
        from,
        did,
        attributeData,
        prevAttributeHash,
        issuerType,
        taoDid,
        taoAttributeId,
      } = body.params[0];
      const data: (string | number)[] = [did, attributeData];

      if (prevAttributeHash) data.push(prefixWith0x(prevAttributeHash));
      data.push(issuerType, taoDid, taoAttributeId);

      let functionSig: string;

      if (prevAttributeHash) {
        // using updateIssuer to update an existing attribute
        functionSig = "updateIssuer(string,bytes,bytes32,uint8,string,bytes32)";
      } else {
        // using updateIssuer to add a new attribute
        functionSig = "updateIssuer(string,bytes,uint8,string,bytes32)";
      }

      const encodedData = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        functionSig,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        data
      );

      return await this.buildTransaction(from, encodedData);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
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

      const { from, policyData, policyId } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertPolicy", [policyId, policyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
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

      const { from, policyData, policyId } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updatePolicy", [policyId, policyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAddIssuerProxy(
    body: RequestAddIssuerProxyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAddIssuerProxyDto, body);

      const { from, did, proxyData } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("addIssuerProxy", [did, proxyData]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateIssuerProxy(
    body: RequestUpdateIssuerProxyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateIssuerProxyDto, body);

      const { from, did, proxyId, proxyData } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateIssuerProxy", [
        did,
        proxyId,
        proxyData,
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async sendTransaction(
    clientId: string,
    body: RequestSendSignedTransactionDto,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestSendSignedTransactionDto, body);

      const request = body.params[0];

      const { signer } = await this.verifyTransaction(request);

      if (!(await this.isDidControlledByAddress(clientId, signer))) {
        throw new Error(
          `The DID ${clientId} is not controlled by the address ${signer}`
        );
      }

      const tx = await (
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);
      return tx.hash;
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}

export default JsonRpcService;
