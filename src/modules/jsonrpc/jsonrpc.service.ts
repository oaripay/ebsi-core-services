import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import { LedgerService } from "../../shared/services/ledger.service";
import {
  RequestInsertAdministratorDto,
  RequestUpdateAdministratorDto,
  RequestInsertIssuerDto,
  RequestUpdateIssuerDto,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  RequestSignedTransactionDto,
  UnsignedTransaction,
  SignedTransactionParam,
  ArgsInsertIssuer,
  ArgsUpdateIssuer,
  ArgsInsertAdministrator,
  ArgsUpdateAdministrator,
  ArgsInsertPolicy,
  ArgsUpdatePolicy,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
  checkHash,
} from "./jsonrpc.utils";
import { prefixWith0x } from "../../shared/utils";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId: string = null;

  private didRegistry: string;

  constructor(
    configService: ConfigService<ApiConfig>,
    private ledgerService: LedgerService
  ) {
    this.didRegistry = configService.get<string>("didRegistryApiUrl");
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
    if (
      data.items
        .map((item) => item.did.toLowerCase())
        .includes(did.toLowerCase())
    ) {
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

  async checkWritePermission(
    address: string,
    clientId: string,
    func: string,
    args: unknown
  ): Promise<void> {
    // Check DID Registry
    if (!(await this.isDidControlledByAddress(clientId, address))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${address}`
      );
    }

    const did = clientId.toLowerCase();

    // An issuer can update his/her own attributes
    if (
      func === "updateIssuer" &&
      (args as ArgsUpdateIssuer).did.toLowerCase() === did
    ) {
      return;
    }

    // Verify if the DID is an admin in the TIR Registry
    try {
      await (await this.ledgerService.getContract()).getAdministrator(did);
    } catch (e) {
      throw new Error(
        `Administrator ${did} was not found in the Trusted Issuers Registry`
      );
    }
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
      case "insertAdministrator": {
        await validateClass(
          ArgsInsertAdministrator,
          args as unknown as ArgsInsertAdministrator
        );
        break;
      }
      case "updateAdministrator": {
        await validateClass(
          ArgsUpdateAdministrator,
          args as unknown as ArgsUpdateAdministrator
        );
        break;
      }
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

  async buildTransactionInsertAdministrator(
    body: RequestInsertAdministratorDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertAdministratorDto, body);

      const { from, did, attribute } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertAdministrator", [
        did.toLowerCase(),
        bufferAttribute,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateAdministrator(
    body: RequestUpdateAdministratorDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateAdministratorDto, body);
      const { from, did, attribute, prevAttributeHash } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = [did.toLowerCase(), bufferAttribute];
      if (prevAttributeHash) data.push(prefixWith0x(prevAttributeHash));
      let functionSig;
      if (prevAttributeHash) {
        // using updateAdministrator function (did, attributeData, lastVersHash)
        functionSig = "updateAdministrator(string,bytes,bytes32)";
      } else {
        // using updateAdministrator function (did, attributeData)
        functionSig = "updateAdministrator(string,bytes)";
      }
      const encodedData = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(
        functionSig,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        data
      );
      return await this.buildTransaction(from, encodedData);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertIssuer(
    body: RequestInsertIssuerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertIssuerDto, body);
      const { from, did, attribute } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertIssuer", [
        did.toLowerCase(),
        bufferAttribute,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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
      const { from, did, attribute, prevAttributeHash } = body.params[0];
      const bufferAttribute = Buffer.from(attribute.body, "base64");
      checkHash(bufferAttribute, attribute.hash);
      const data = [did.toLowerCase(), bufferAttribute];
      if (prevAttributeHash) data.push(prefixWith0x(prevAttributeHash));
      let functionSig;
      if (prevAttributeHash) {
        // using updateIssuer function (did, attributeData, lastVersHash)
        functionSig = "updateIssuer(string,bytes,bytes32)";
      } else {
        // using updateIssuer function (did, attributeData)
        functionSig = "updateIssuer(string,bytes)";
      }
      const encodedData = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData(
        functionSig,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        data
      );
      return await this.buildTransaction(from, encodedData);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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
      const { from, policy, policyId } = body.params[0];
      const bufferPolicy = Buffer.from(policy, "base64");
      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertPolicy", [policyId, bufferPolicy]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
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
      const { from, policy, policyId } = body.params[0];
      const bufferPolicy = Buffer.from(policy, "base64");
      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updatePolicy", [policyId, bufferPolicy]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async sendTransaction(
    clientId: string,
    body: RequestSignedTransactionDto,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestSignedTransactionDto, body);

      const request = body.params[0];
      const { signer, functionName, args } = await this.verifyTransaction(
        request
      );

      await this.checkWritePermission(signer, clientId, functionName, args);

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

export default JsonRpcService;
