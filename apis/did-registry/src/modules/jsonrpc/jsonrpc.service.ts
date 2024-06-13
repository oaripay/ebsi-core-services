import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  remove0xPrefix,
  getErrorMessage,
  InvalidRequestJsonRpcError,
  isEthersError,
} from "@ebsiint-api/shared";
import {
  RequestSendSignedTransactionDto,
  SignedTransactionParam,
  UnsignedTransaction,
  ArgsInsertHashAlgorithm,
  RequestInsertHashAlgorithmDto,
  RequestUpdateHashAlgorithmDto,
  ArgsUpdateHashAlgorithm,
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
  ArgsAppendDidDocumentVersionHash,
  RequestAppendDidDocumentVersionHashDto,
  ArgsDetachDidDocumentVersionHash,
  RequestDetachDidDocumentVersionHashDto,
  ArgsAppendDidDocumentVersionMetadata,
  RequestAppendDidDocumentVersionMetadataDto,
  RequestDetachDidDocumentVersionMetadataDto,
  ArgsDetachDidDocumentVersionMetadata,
} from "./dto/index.js";
import {
  formatEthersUnsignedTransaction,
  formatEthersSignature,
  validateClass,
} from "./jsonrpc.utils.js";
import { LedgerService } from "../ledger/ledger.service.js";

// Cache algorithms' output lengths for 30 minutes
const ALGORITHMS_EXP = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private chainId = "";

  private contractAddress: string;

  private algIdsToOutputLength: Record<
    number,
    { outputLength: number; exp: number }
  > = {};

  constructor(private ledgerService: LedgerService) {
    this.contractAddress = ledgerService.getContractAddress();
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

  async verifyDidRegistry(
    controllerAddress: string,
    did: string,
    currentPage = 1,
  ): Promise<boolean> {
    const pageSize = 50;

    try {
      const data = await (
        await this.ledgerService.getContract()
      ).getDidRecordIdentifiersByControllerId(
        controllerAddress,
        currentPage,
        pageSize,
      );

      // Check if DID is in the list
      if (
        data.items
          .map((hexDid) =>
            Buffer.from(remove0xPrefix(hexDid), "hex").toString("utf8"),
          )
          .includes(did)
      ) {
        return true;
      }

      // Recursive call if there are more pages
      if (currentPage * pageSize < data.total.toNumber()) {
        return await this.verifyDidRegistry(
          controllerAddress,
          did,
          currentPage + 1,
        );
      }
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      return false;
    }

    return false;
  }

  async checkHash(hashAlgorithmId: number, hashValue: string): Promise<void> {
    const now = Date.now();

    if (
      !this.algIdsToOutputLength[hashAlgorithmId] ||
      this.algIdsToOutputLength[hashAlgorithmId]!.exp < now
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
        if (isEthersError(error)) {
          this.logger.error(error, error.stack);
        }
        throw new Error(
          `Can't find hash algorithm with ID: ${hashAlgorithmId}`,
        );
      }
    }

    // Compare lengths
    const expectedOutputLength =
      this.algIdsToOutputLength[hashAlgorithmId]!.outputLength;
    const hashLength =
      Buffer.from(remove0xPrefix(hashValue), "hex").byteLength * 8;
    if (hashLength !== expectedOutputLength) {
      throw new Error(
        `Hash ${hashValue}'s length (${hashLength} bits) is different from the expected length (${expectedOutputLength} bits)`,
      );
    }
  }

  checkDid(clientId: string, identifier: string, didDocument?: string): void {
    const identifierUtf8 = Buffer.from(
      remove0xPrefix(identifier),
      "hex",
    ).toString("utf-8");

    // Compare JWT's DID with "identifier" param
    if (clientId !== identifierUtf8) {
      throw new Error(
        `Identifier ${identifierUtf8} doesn't match JWT's DID ${clientId}`,
      );
    }

    if (!didDocument) return;

    // Check if DID document's "id" matches with the JWT's DID
    const parsedDidDocument = JSON.parse(
      Buffer.from(remove0xPrefix(didDocument), "hex").toString("utf-8"),
    ) as { id?: string };

    if (clientId !== parsedDidDocument.id) {
      throw new Error(
        `DID document's "id" ${parsedDidDocument.id} doesn't match JWT's DID ${clientId}`,
      );
    }
  }

  async verifyTransaction(
    clientId: string,
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

    if (serializedTransactionSigned !== signedRawTransaction) {
      throw new Error(
        `The unsigned transaction + signature (${serializedTransactionSigned}) does not match with the signedRawTransaction (${signedRawTransaction})`,
      );
    }

    // recover address used to sign
    const digest = ethers.utils.keccak256(serializedTransaction);
    const signer = ethers.utils.recoverAddress(digest, signature);

    if (signer.toLowerCase() !== unsignedTransaction.from.toLowerCase()) {
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

    switch (functionFragment.name) {
      case "insertHashAlgorithm": {
        await validateClass(
          ArgsInsertHashAlgorithm,
          args as unknown as ArgsInsertHashAlgorithm,
        );
        break;
      }
      case "updateHashAlgorithm": {
        await validateClass(
          ArgsUpdateHashAlgorithm,
          args as unknown as ArgsUpdateHashAlgorithm,
        );
        break;
      }
      case "insertDidDocument": {
        const castArgs = args as unknown as ArgsInsertDidDocument;
        await validateClass(ArgsInsertDidDocument, castArgs);
        this.checkDid(clientId, castArgs.identifier, castArgs.didVersionInfo);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "updateDidDocument": {
        const castArgs = args as unknown as ArgsUpdateDidDocument;
        await validateClass(ArgsUpdateDidDocument, castArgs);
        this.checkDid(clientId, castArgs.identifier, castArgs.didVersionInfo);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "insertDidController": {
        const castArgs = args as unknown as ArgsInsertDidController;
        await validateClass(ArgsInsertDidController, castArgs);
        this.checkDid(clientId, castArgs.identifier);
        break;
      }
      case "updateDidController": {
        const castArgs = args as unknown as ArgsUpdateDidController;
        await validateClass(ArgsUpdateDidController, castArgs);
        this.checkDid(clientId, castArgs.identifier);
        break;
      }
      case "revokeDidController": {
        const castArgs = args as unknown as ArgsRevokeDidController;
        await validateClass(ArgsRevokeDidController, castArgs);
        this.checkDid(clientId, castArgs.identifier);
        break;
      }
      case "appendDidDocumentVersionHash": {
        const castArgs = args as unknown as ArgsAppendDidDocumentVersionHash;
        await validateClass(ArgsAppendDidDocumentVersionHash, castArgs);
        this.checkDid(clientId, castArgs.identifier, castArgs.didVersionInfo);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "detachDidDocumentVersionHash": {
        const castArgs = args as unknown as ArgsDetachDidDocumentVersionHash;
        await validateClass(ArgsDetachDidDocumentVersionHash, castArgs);
        this.checkDid(clientId, castArgs.identifier, castArgs.didVersionInfo);
        await this.checkHash(castArgs.hashAlgorithmId, castArgs.hashValue);
        break;
      }
      case "appendDidDocumentVersionMetadata": {
        const castArgs =
          args as unknown as ArgsAppendDidDocumentVersionMetadata;
        await validateClass(ArgsAppendDidDocumentVersionMetadata, castArgs);
        this.checkDid(clientId, castArgs.identifier, castArgs.didVersionInfo);
        break;
      }
      case "detachDidDocumentVersionMetadata": {
        const castArgs =
          args as unknown as ArgsDetachDidDocumentVersionMetadata;
        await validateClass(ArgsDetachDidDocumentVersionMetadata, castArgs);
        this.checkDid(clientId, castArgs.identifier, castArgs.didVersionInfo);
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
    try {
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
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new Error("Could not build transaction.");
    }
  }

  async buildTransactionInsertHashAlgorithm(
    body: RequestInsertHashAlgorithmDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertHashAlgorithmDto, body);

      const { from, outputLength, ianaName, oid, status, multihash } =
        body.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionUpdateHashAlgorithm(
    body: RequestUpdateHashAlgorithmDto,
    id?: number | string,
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
      } = body.params[0]!;

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
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }

  async buildTransactionInsertDidDocument(
    clientId: string,
    body: RequestInsertDidDocumentDto,
    id?: number | string,
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
      } = body.params[0]!;

      this.checkDid(clientId, identifier, didVersionInfo);
      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertDidDocument", [
        identifier,
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData ?? "0x",
        didVersionMetadata ?? "0x",
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

  async buildTransactionUpdateDidDocument(
    clientId: string,
    body: RequestUpdateDidDocumentDto,
    id?: number | string,
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
      } = body.params[0]!;

      this.checkDid(clientId, identifier, didVersionInfo);
      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateDidDocument", [
        identifier,
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
        timestampData ?? "0x",
        didVersionMetadata ?? "0x",
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

  async buildTransactionInsertDidController(
    clientId: string,
    body: RequestInsertDidControllerDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestInsertDidControllerDto, body);

      const { from, identifier, newControllerId, notBefore, notAfter } =
        body.params[0]!;

      this.checkDid(clientId, identifier);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("insertDidController", [
        identifier,
        newControllerId.toLowerCase(),
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

  async buildTransactionUpdateDidController(
    clientId: string,
    body: RequestUpdateDidControllerDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestUpdateDidControllerDto, body);

      const { from, identifier, newControllerId, notBefore, notAfter } =
        body.params[0]!;

      this.checkDid(clientId, identifier);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("updateDidController", [
        identifier,
        newControllerId.toLowerCase(),
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

  async buildTransactionRevokeDidController(
    clientId: string,
    body: RequestRevokeDidControllerDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestRevokeDidControllerDto, body);

      const { from, identifier, oldControllerId } = body.params[0]!;

      this.checkDid(clientId, identifier);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("revokeDidController", [
        identifier,
        oldControllerId.toLowerCase(),
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

  async buildTransactionAppendDidDocumentVersionHash(
    clientId: string,
    body: RequestAppendDidDocumentVersionHashDto,
    id?: number | string,
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
      } = body.params[0]!;

      this.checkDid(clientId, identifier, didVersionInfo);
      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("appendDidDocumentVersionHash", [
        identifier,
        hashAlgorithmId,
        hashValue,
        timestampData ?? "0x",
        didVersionInfo,
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

  async buildTransactionDetachDidDocumentVersionHash(
    clientId: string,
    body: RequestDetachDidDocumentVersionHashDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDetachDidDocumentVersionHashDto, body);

      const { from, identifier, hashAlgorithmId, hashValue, didVersionInfo } =
        body.params[0]!;

      this.checkDid(clientId, identifier, didVersionInfo);
      await this.checkHash(hashAlgorithmId, hashValue);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("detachDidDocumentVersionHash", [
        identifier,
        hashAlgorithmId,
        hashValue,
        didVersionInfo,
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

  async buildTransactionAppendDidDocumentVersionMetadata(
    clientId: string,
    body: RequestAppendDidDocumentVersionMetadataDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestAppendDidDocumentVersionMetadataDto, body);

      const { from, identifier, didVersionInfo, didVersionMetadata } =
        body.params[0]!;

      this.checkDid(clientId, identifier, didVersionInfo);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("appendDidDocumentVersionMetadata", [
        identifier,
        didVersionInfo,
        didVersionMetadata,
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

  async buildTransactionDetachDidDocumentVersionMetadata(
    clientId: string,
    body: RequestDetachDidDocumentVersionMetadataDto,
    id?: number | string,
  ): Promise<UnsignedTransaction> {
    try {
      await validateClass(RequestDetachDidDocumentVersionMetadataDto, body);

      const { from, identifier, didVersionInfo, didVersionMetadata } =
        body.params[0]!;

      this.checkDid(clientId, identifier, didVersionInfo);

      const data = (
        await this.ledgerService.getContract()
      ).interface.encodeFunctionData("detachDidDocumentVersionMetadata", [
        identifier,
        didVersionInfo,
        didVersionMetadata,
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
    } catch (err) {
      const error = new InvalidRequestJsonRpcError(getErrorMessage(err), id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }

    try {
      const request = body.params[0]!;
      const { signer, functionName } = await this.verifyTransaction(
        clientId,
        request,
      );
      if (
        functionName !== "insertDidDocument" &&
        !(await this.verifyDidRegistry(signer, clientId))
      ) {
        throw new Error(
          `The DID ${clientId} is not controlled by the address ${signer}`,
        );
      }

      const tx = await (
        await this.ledgerService.getContract({ protectedMethod: true })
      ).provider.sendTransaction(request.signedRawTransaction);
      return tx.hash;
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
        throw new InvalidRequestJsonRpcError(error.reason, id);
      }

      const err = new InvalidRequestJsonRpcError(getErrorMessage(error), id);
      if (error instanceof Error && error.stack) {
        err.stack = error.stack;
      }
      throw err;
    }
  }
}

export default { JsonRpcService };
