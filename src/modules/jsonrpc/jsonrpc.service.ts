import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  RequestSignedTransactionDto,
  SignedTransactionParam,
  UnsignedTransaction,
  ArgsInsertAdministrator,
  RequestInsertAdministratorDto,
  ArgsUpdateAdministrator,
  RequestUpdateAdministratorDto,
  ArgsInsertHashAlgorithm,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  ArgsUpdateHashAlgorithm,
  ArgsInsertPolicy,
  RequestInsertPolicyDto,
  RequestUpdatePolicyDto,
  ArgsUpdatePolicy,
  RequestInsertDidControllerDto,
  ArgsInsertDidController,
  RequestInsertDidDocumentDto,
  ArgsInsertDidDocument,
  RequestUpdateDidDocumentDto,
  ArgsUpdateDidDocument,
  RequestUpdateDidControllerDto,
  ArgsUpdateDidController,
  RequestRevokeDidControllerDto,
  ArgsRevokeDidController,
  RequestInsertDidMethodDto,
  ArgsInsertDidMethod,
  RequestUpdateDidMethodDto,
  ArgsUpdateDidMethod,
  ArgsAppendDidDocumentVersionHash,
  RequestAppendDidDocumentVersionHashDto,
  ArgsDetachDidDocumentVersionHash,
  RequestDetachDidDocumentVersionHashDto,
  ArgsAppendDidDocumentVersionMetadata,
  RequestAppendDidDocumentVersionMetadataDto,
  RequestDetachDidDocumentVersionMetadataDto,
  ArgsDetachDidDocumentVersionMetadata,
} from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
  lowerCaseHexEncodedIdentifier,
} from "./jsonrpc.utils";
import { LedgerService } from "../ledger/ledger.service";
import { prefixWith0x, remove0xPrefix } from "../../shared/utils";

// Cache algorightms' output lengths for 30 minutes
const ALGORITHMS_EXP = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId: string = null;

  private algIdsToOutputLength: Record<
    number,
    { outputLength: number; exp: number }
  > = {};

  constructor(private ledgerService: LedgerService) {}

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

  async verifyDidRegistry(
    controllerAddress: string,
    did: string,
    currentPage = 1
  ): Promise<boolean> {
    const pageSize = 50;

    const data = await (
      await this.ledgerService.getContract()
    ).getDidRecordIdentifiersByControllerId(
      controllerAddress,
      currentPage,
      pageSize
    );

    // Check if DID is in the list
    if (
      data.items
        .map((hexDid) =>
          Buffer.from(remove0xPrefix(hexDid), "hex")
            .toString("utf8")
            .toLowerCase()
        )
        .includes(did.toLowerCase())
    ) {
      return true;
    }

    // Recursive call if there are more pages
    if (currentPage * pageSize < data.total.toNumber()) {
      return this.verifyDidRegistry(controllerAddress, did, currentPage + 1);
    }

    return false;
  }

  async checkWritePermission(
    func: string,
    controllerAddress: string,
    clientId: string
  ): Promise<void> {
    // If the function is not in the list, then any user/app can access it
    if (
      ![
        "insertAdministrator",
        "updateAdministrator",
        "insertHashAlgorithm",
        "updateHashAlgorithm",
        "insertDidMethod",
        "updateDidMethod",
        "insertPolicy",
        "updatePolicy",
      ].includes(func)
    ) {
      return;
    }

    try {
      await (
        await this.ledgerService.getContract()
      ).getAdministrator(clientId.toLowerCase());
    } catch (e) {
      throw new Error(
        `Administrator ${clientId} was not found in the DID Registry`
      );
    }

    // Check DID Registry
    if (!(await this.verifyDidRegistry(controllerAddress, clientId))) {
      throw new Error(
        `The DID ${clientId} is not controlled by the address ${controllerAddress}`
      );
    }
  }

  async checkHash(hashAlgorithmId: number, hashValue: string): Promise<void> {
    const now = Date.now();

    if (
      !this.algIdsToOutputLength[hashAlgorithmId] ||
      this.algIdsToOutputLength[hashAlgorithmId].exp < now
    ) {
      // Get hash algorithm corresponding to hashAlgorithmId
      try {
        const hashAlgorithm = await (
          await this.ledgerService.getContract()
        ).getHashAlgorithmById(hashAlgorithmId);

        const outputLength = hashAlgorithm.outputLength.toNumber();

        // Store in cache
        this.algIdsToOutputLength[hashAlgorithmId] = {
          outputLength,
          exp: now + ALGORITHMS_EXP,
        };
      } catch (error) {
        throw new Error(
          `Can't find hash algorithm with ID: ${hashAlgorithmId}`
        );
      }
    }

    // Compare lengths
    const expectedOutputLength =
      this.algIdsToOutputLength[hashAlgorithmId].outputLength;
    const hashLength =
      Buffer.from(hashValue.replace("0x", ""), "hex").byteLength * 8;
    if (hashLength !== expectedOutputLength) {
      throw new Error(
        `Hash ${hashValue}'s length (${hashLength} bits) is different from the expected length (${expectedOutputLength} bits)`
      );
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
      case "insertDidDocument": {
        const castArgs = args as unknown as ArgsInsertDidDocument;
        await validateClass(ArgsInsertDidDocument, castArgs);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "updateDidDocument": {
        const castArgs = args as unknown as ArgsUpdateDidDocument;
        await validateClass(ArgsUpdateDidDocument, castArgs);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "insertDidController": {
        await validateClass(
          ArgsInsertDidController,
          args as unknown as ArgsInsertDidController
        );
        break;
      }
      case "updateDidController": {
        await validateClass(
          ArgsUpdateDidController,
          args as unknown as ArgsUpdateDidController
        );
        break;
      }
      case "revokeDidController": {
        await validateClass(
          ArgsRevokeDidController,
          args as unknown as ArgsRevokeDidController
        );
        break;
      }
      case "insertDidMethod": {
        await validateClass(
          ArgsInsertDidMethod,
          args as unknown as ArgsInsertDidMethod
        );
        break;
      }
      case "updateDidMethod": {
        await validateClass(
          ArgsUpdateDidMethod,
          args as unknown as ArgsUpdateDidMethod
        );
        break;
      }
      case "appendDidDocumentVersionHash": {
        const castArgs = args as unknown as ArgsAppendDidDocumentVersionHash;
        await validateClass(ArgsAppendDidDocumentVersionHash, castArgs);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "detachDidDocumentVersionHash": {
        const castArgs = args as unknown as ArgsDetachDidDocumentVersionHash;
        await validateClass(ArgsDetachDidDocumentVersionHash, castArgs);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "appendDidDocumentVersionMetadata": {
        await validateClass(
          ArgsAppendDidDocumentVersionMetadata,
          args as unknown as ArgsAppendDidDocumentVersionMetadata
        );
        break;
      }
      case "detachDidDocumentVersionMetadata": {
        await validateClass(
          ArgsDetachDidDocumentVersionMetadata,
          args as unknown as ArgsDetachDidDocumentVersionMetadata
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

      const { from, did, attributeData } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertAdministrator", [
        did.toLowerCase(),
        attributeData,
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

      const { from, did, attributeData, prevAttributeHash } = body.params[0];

      const data = [did.toLowerCase(), attributeData];

      if (prevAttributeHash) {
        data.push(prefixWith0x(prevAttributeHash));
      }

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

  async buildTransactionInsertPolicy(
    body: RequestInsertPolicyDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertPolicyDto, body);
      const { from, policyId, policyData } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertPolicy", [policyId, policyData]);
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
      const { from, policyId, policyData } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updatePolicy", [policyId, policyData]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
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

  async buildTransactionInsertDidDocument(
    body: RequestInsertDidDocumentDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertDidDocumentDto, body);

      const {
        from,
        identifier,
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      } = body.params[0];

      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertDidDocument", [
        lowerCaseHexEncodedIdentifier(identifier),
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData ?? "0x",
        didVersionMetadata ?? "0x",
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateDidDocument(
    body: RequestUpdateDidDocumentDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateDidDocumentDto, body);

      const {
        from,
        identifier,
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      } = body.params[0];

      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateDidDocument", [
        lowerCaseHexEncodedIdentifier(identifier),
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData ?? "0x",
        didVersionMetadata ?? "0x",
      ]);

      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertDidController(
    body: RequestInsertDidControllerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertDidControllerDto, body);

      const { from, identifier, newControllerId, notBefore, notAfter } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertDidController", [
        lowerCaseHexEncodedIdentifier(identifier),
        newControllerId.toLowerCase(),
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

  async buildTransactionUpdateDidController(
    body: RequestUpdateDidControllerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateDidControllerDto, body);

      const { from, identifier, newControllerId, notBefore, notAfter } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateDidController", [
        lowerCaseHexEncodedIdentifier(identifier),
        newControllerId.toLowerCase(),
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

  async buildTransactionRevokeDidController(
    body: RequestRevokeDidControllerDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestRevokeDidControllerDto, body);

      const { from, identifier, oldControllerId } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeDidController", [
        lowerCaseHexEncodedIdentifier(identifier),
        oldControllerId.toLowerCase(),
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionInsertDidMethod(
    body: RequestInsertDidMethodDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertDidMethodDto, body);

      const {
        from,
        methodName,
        ledgerName,
        methodSpec,
        methodSpecHash,
        notBefore,
        notAfter,
        status,
      } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertDidMethod", [
        methodName,
        ledgerName,
        methodSpec,
        methodSpecHash,
        notBefore,
        notAfter,
        status,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionUpdateDidMethod(
    body: RequestUpdateDidMethodDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateDidMethodDto, body);

      const {
        from,
        methodName,
        ledgerName,
        methodSpec,
        methodSpecHash,
        notBefore,
        notAfter,
        status,
      } = body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateDidMethod", [
        methodName,
        ledgerName,
        methodSpec,
        methodSpecHash,
        notBefore,
        notAfter,
        status,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAppendDidMethodVersionHash(
    body: RequestAppendDidDocumentVersionHashDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAppendDidDocumentVersionHashDto, body);

      const {
        from,
        identifier,
        hashAlgorithmId,
        hashValue,
        timestampData,
        didVersionInfo,
      } = body.params[0];

      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("appendDidDocumentVersionHash", [
        lowerCaseHexEncodedIdentifier(identifier),
        hashAlgorithmId,
        hashValue,
        timestampData ?? "0x",
        didVersionInfo,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionDetachDidMethodVersionHash(
    body: RequestDetachDidDocumentVersionHashDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDetachDidDocumentVersionHashDto, body);

      const { from, identifier, hashAlgorithmId, hashValue, didVersionInfo } =
        body.params[0];

      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("detachDidDocumentVersionHash", [
        lowerCaseHexEncodedIdentifier(identifier),
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionAppendDidMethodVersionMetadata(
    body: RequestAppendDidDocumentVersionMetadataDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAppendDidDocumentVersionMetadataDto, body);

      const { from, identifier, didVersionInfo, didVersionMetadata } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("appendDidDocumentVersionMetadata", [
        lowerCaseHexEncodedIdentifier(identifier),
        didVersionInfo,
        didVersionMetadata,
      ]);
      return await this.buildTransaction(from, data);
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }

  async buildTransactionDetachDidMethodVersionMetadata(
    body: RequestDetachDidDocumentVersionMetadataDto,
    id?: number | string
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDetachDidDocumentVersionMetadataDto, body);

      const { from, identifier, didVersionInfo, didVersionMetadata } =
        body.params[0];

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("detachDidDocumentVersionMetadata", [
        lowerCaseHexEncodedIdentifier(identifier),
        didVersionInfo,
        didVersionMetadata,
      ]);
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
      const { signer, functionName } = await this.verifyTransaction(request);

      await this.checkWritePermission(functionName, signer, clientId);

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
