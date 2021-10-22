import fs from "fs";
import path from "path";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Gateway,
  GatewayOptions,
  Network,
  Wallets,
  X509Identity,
} from "fabric-network";
import {
  InternalServerError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import * as fabprotos from "fabric-protos";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore fabric-common doesn't expose the TS definition correctly - https://github.com/hyperledger/fabric-sdk-node/pull/477
import { BlockData, BlockDecoder } from "fabric-common";
import {
  Block,
  FabricChannelHeader,
  ConnectionProfile,
  FabricBlock,
  Transaction,
  FabricTransaction,
} from "./interfaces";
import { ApiConfig } from "../../config/configuration";
import { decodePageAfter, encodePageAfter } from "./fabric.formatter";
import { encodeMultibase64url, validateClass } from "./fabric.utils";
import { RequestReadContractDto } from "./dto/request-read-contract.dto";
import { InvalidRequestJsonRpcError } from "./errors";
import { RequestSendProposalDto } from "./dto/request-send-proposal.dto";
import {
  CommitAction,
  ProposalAction,
  ProposalResponseBase64,
} from "./fabric.interface";
import { RequestCommitTransactionDto } from "./dto/request-commit-transaction.dto";

@Injectable()
export class FabricService implements OnModuleDestroy {
  private readonly logger = new Logger(FabricService.name);

  private fabricConfig: ApiConfig["fabric"];

  private gateway: Gateway;

  private connectionProfile: ConnectionProfile;

  private identity: X509Identity;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.fabricConfig = this.configService.get<ApiConfig["fabric"]>("fabric");

    if (!this.fabricConfig.enabled) return;

    this.connectionProfile = FabricService.importConnectionProfile();

    this.connectionProfile.client.adminCredential.id =
      this.fabricConfig.username;
    this.connectionProfile.client.adminCredential.password =
      this.fabricConfig.password;
    this.connectionProfile.organizations.betaxiossdrpoc.adminPrivateKey.pem =
      this.fabricConfig.pem;
    this.connectionProfile.organizations.betaxiossdrpoc.adminPrivateKey.xpath =
      this.fabricConfig.xpath;

    this.identity = FabricService.importIdentityWallet();
  }

  onModuleDestroy(): void {
    if (this.gateway) {
      this.gateway.disconnect();
    }
  }

  static importConnectionProfile(): ConnectionProfile {
    const rawdata = fs.readFileSync(
      path.resolve(__dirname, "../../../wallet/connectionProfile.json"),
      "utf-8"
    );

    return JSON.parse(rawdata.toString()) as ConnectionProfile;
  }

  static importIdentityWallet(): X509Identity {
    const rawdata = fs.readFileSync(
      path.resolve(__dirname, "../../../wallet/identityWallet.json"),
      "utf-8"
    );

    return JSON.parse(rawdata.toString()) as X509Identity;
  }

  getConnectionProfile(): ConnectionProfile {
    return this.connectionProfile;
  }

  private async connectGateway(): Promise<void> {
    if (this.gateway) return;

    const wallet = await Wallets.newFileSystemWallet("./wallet");

    await wallet.put(this.fabricConfig.username, this.identity);

    const gatewayOptions: GatewayOptions = {
      identity: this.fabricConfig.username,
      wallet,
      discovery: { enabled: true, asLocalhost: false },
    };

    const gateway = new Gateway();

    try {
      await gateway.connect(this.connectionProfile, gatewayOptions);
      this.gateway = gateway;
    } catch (error) {
      this.logger.error(error);
      throw new Error(
        "Ledger API gateway could not connect to Hyperledger Fabric ledger"
      );
    }
  }

  private async executeQuery(
    channelName: string,
    chaincode: string,
    query: string,
    args: string[]
  ): Promise<Buffer> {
    await this.connectGateway();

    let queryResult: Buffer;

    try {
      const network = await this.gateway.getNetwork(channelName);
      const contract = network.getContract(chaincode);
      queryResult = await contract.evaluateTransaction(query, ...args);
    } catch (error) {
      throw new Error(
        `Query to Hyperledger Fabric ledger failed: ${(error as Error).message}`
      );
    }

    if (!queryResult) {
      throw new Error("Query to Hyperledger Fabric result is empty");
    }

    return queryResult;
  }

  getChannels(): string[] {
    const channelsNames = Object.keys(this.connectionProfile.channels);
    return channelsNames;
  }

  async getChannelBlock(
    channelName: string,
    blockIndex: string
  ): Promise<Block> {
    let blockQueryResult: Buffer;

    try {
      blockQueryResult = await this.executeQuery(
        channelName,
        "qscc", // Query System Chaincode
        "GetBlockByNumber",
        [channelName, blockIndex]
      );
    } catch (e) {
      if ((e as Error).message.includes("Entry not found in index")) {
        throw new NotFoundError(NotFoundError.defaultTitle, {
          detail: `Block ${blockIndex} not found`,
        });
      }

      this.logger.error(e);
      throw e;
    }

    // Hopefully fabric-common will provide the correct defintions 🤞
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const decodedBlock = BlockDecoder.decode(blockQueryResult) as FabricBlock; // warning: not exact

    const timestamp =
      decodedBlock.data.data[0].payload.header?.channel_header?.timestamp ?? "";

    const txIds = decodedBlock.data?.data
      ?.map((tx: BlockData): string => {
        return (
          tx.payload.header as {
            channel_header?: FabricChannelHeader;
          }
        ).channel_header.tx_id;
      })
      .filter((id) => id);

    const block: Block = {
      blockNum:
        typeof decodedBlock.header.number === "number"
          ? decodedBlock.header.number
          : decodedBlock.header.number.toNumber(),
      channelName,
      timestamp,
      dataHash: encodeMultibase64url(decodedBlock.header.data_hash),
      prevHash: encodeMultibase64url(decodedBlock.header.previous_hash),
      txCount: txIds.length,
      txIds,
    };

    return block;
  }

  async getBlockHeight(channelName: string): Promise<number> {
    const blockChannelResult = await this.executeQuery(
      channelName,
      "qscc", // Query System Chaincode
      "GetChainInfo",
      [channelName]
    );

    const channelResultJson =
      fabprotos.common.BlockchainInfo.decode(blockChannelResult);

    const height =
      typeof channelResultJson.height === "number"
        ? channelResultJson.height
        : channelResultJson.height.toInt();
    return height;
  }

  async getChannelBlocks(
    channelName: string,
    pageAfter: number,
    pageSize: number
  ): Promise<{ blocks: Block[]; total: number }> {
    const numberOfBlocks = await this.getBlockHeight(channelName);
    if (numberOfBlocks < 0) {
      this.logger.error(`Invalid number of blocks: ${numberOfBlocks}`);
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Invalid number of blocks",
      });
    }

    const firstBlockIndex = numberOfBlocks - 1 - (pageAfter - 1) * pageSize;

    if (firstBlockIndex < 0) {
      return { blocks: [], total: numberOfBlocks };
    }

    const lastBlockIndex = Math.max(firstBlockIndex - pageSize + 1, 0);

    const blocks: Block[] = [];

    for (
      let blockIndex = firstBlockIndex;
      blockIndex >= lastBlockIndex;
      blockIndex -= 1
    ) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const block = await this.getChannelBlock(
          channelName,
          blockIndex.toString()
        );
        blocks.push(block);
      } catch (e) {
        this.logger.error(e);
        throw new InternalServerError(InternalServerError.defaultTitle, {
          detail: "An error happened while fetching a block",
        });
      }
    }

    return { blocks, total: numberOfBlocks };
  }

  async getChannelTransactions(
    channelName: string,
    pageAfter: string,
    pageSize: number
  ): Promise<{
    transactions: Transaction[];
    firstPage: string;
    nextPage: string;
  }> {
    const blockHeight = await this.getBlockHeight(channelName);
    let iniTx = null;
    let iniBlock = blockHeight - 1;
    if (pageAfter) {
      const { blockNumber, txId } = decodePageAfter(pageAfter);
      iniBlock = blockNumber;
      iniTx = txId;
    }
    let blockIndex: number;
    const transactions: Transaction[] = [];
    /* eslint-disable no-await-in-loop */
    for (
      blockIndex = blockHeight - 1;
      transactions.length < pageSize + 1 && blockIndex >= 0;
      blockIndex -= 1
    ) {
      let blockQueryResult: Buffer;

      try {
        blockQueryResult = await this.executeQuery(
          channelName,
          "qscc", // Query System Chaincode
          "GetBlockByNumber",
          [channelName, blockIndex.toString()]
        );
      } catch (e) {
        if ((e as Error).message.includes("Entry not found in index")) {
          throw new NotFoundError(NotFoundError.defaultTitle, {
            detail: `Block ${blockIndex} not found`,
          });
        }

        this.logger.error(e);
        throw e;
      }

      // Hopefully fabric-common will provide the correct defintions 🤞
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const block = BlockDecoder.decode(blockQueryResult) as FabricBlock; // warning: not exact

      const validationCode = block.metadata.metadata[2][0];

      const txs = block.data.data
        .map(
          (tx) =>
            ({
              txId: tx.payload.header.channel_header.tx_id,
              type: tx.payload.header.channel_header.typeString,
              timestamp: tx.payload.header.channel_header.timestamp,
              channelId: tx.payload.header.channel_header.channel_id,
              creatorMspId: tx.payload.header.signature_header.creator.mspid,
              blockNum: Number(block.header.number),
              validationCode,
              ...(tx.payload.data.actions && {
                actions: tx.payload.data.actions.map((action) => ({
                  creatorMspId: action.header.creator.mspid,
                  chaincodeId:
                    action.payload.chaincode_proposal_payload.input
                      .chaincode_spec.chaincode_id.name,
                  proposalHash: encodeMultibase64url(
                    action.payload.action.proposal_response_payload
                      .proposal_hash
                  ),
                  response:
                    action.payload.action.proposal_response_payload.extension
                      .response,
                  endorsersMspId: action.payload.action.endorsements.map(
                    (endorsement) => endorsement.endorser.mspid
                  ),
                })),
              }),
            } as Transaction)
        )
        .filter((tx) => tx.txId);

      if (iniTx && blockIndex === iniBlock) {
        // delete transactions before iniTx
        const index = txs.findIndex((t) => t.txId === iniTx);
        const deleteCount = index;
        txs.splice(0, deleteCount);
      }

      if (transactions.length + txs.length > pageSize + 1) {
        // remove extra transactions
        const deleteCount = transactions.length + txs.length - pageSize - 1;
        txs.splice(txs.length - deleteCount, deleteCount);
      }

      transactions.splice(transactions.length, 0, ...txs);
    }
    /* eslint-enable no-await-in-loop */
    blockIndex += 1;

    const firstPage = encodePageAfter(blockHeight - 1, "");
    let nextPage: string;
    if (transactions.length === pageSize + 1) {
      // remove the last tx and define it as the next one
      const [nextTx] = transactions.splice(transactions.length - 1, 1);
      nextPage = encodePageAfter(nextTx.blockNum, nextTx.txId);
    } else {
      // this is the last page
      nextPage = pageAfter ?? firstPage;
    }

    return { transactions, firstPage, nextPage };
  }

  async getChannelTransaction(
    channelName: string,
    transactionId: string
  ): Promise<Transaction> {
    let transactionQueryResult: Buffer;

    try {
      transactionQueryResult = await this.executeQuery(
        channelName,
        "qscc", // Query System Chaincode
        "GetTransactionByID",
        [channelName, transactionId]
      );
    } catch (e) {
      if ((e as Error).message.includes("Entry not found in index")) {
        throw new NotFoundError(NotFoundError.defaultTitle, {
          detail: `Transaction ${transactionId} not found`,
        });
      }

      this.logger.error(e);
      throw e;
    }

    // Hopefully fabric-common will provide the correct defintions 🤞
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const transaction = BlockDecoder.decodeTransaction(
      transactionQueryResult
    ) as {
      validationCode: fabprotos.protos.TxValidationCode;
      transactionEnvelope: FabricTransaction;
    };

    const tx = transaction.transactionEnvelope;

    return {
      txId: tx.payload.header.channel_header.tx_id,
      type: tx.payload.header.channel_header.typeString,
      timestamp: tx.payload.header.channel_header.timestamp,
      validationCode: transaction.validationCode,
      channelId: tx.payload.header.channel_header.channel_id,
      creatorMspId: tx.payload.header.signature_header.creator.mspid,
      ...(tx.payload.data.actions && {
        actions: tx.payload.data.actions.map((action) => ({
          creatorMspId: action.header.creator.mspid,
          chaincodeId:
            action.payload.chaincode_proposal_payload.input.chaincode_spec
              .chaincode_id.name,
          proposalHash: encodeMultibase64url(
            action.payload.action.proposal_response_payload.proposal_hash
          ),
          response:
            action.payload.action.proposal_response_payload.extension.response,
          endorsersMspId: action.payload.action.endorsements.map(
            (endorsement) => endorsement.endorser.mspid
          ),
        })),
      }),
    };
  }

  async readContract(
    body: RequestReadContractDto,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestReadContractDto, body);
    } catch (err) {
      throw new InvalidRequestJsonRpcError((err as Error).message, id);
    }
    const { channelName, contractName, fcn, args } = body.params[0];
    const bufferResponse = await this.executeQuery(
      channelName,
      contractName,
      fcn,
      args
    );
    return bufferResponse.toString("base64");
  }

  async sendProposal(
    body: RequestSendProposalDto,
    id?: number | string
  ): Promise<ProposalResponseBase64[]> {
    try {
      await validateClass(RequestSendProposalDto, body);
    } catch (err) {
      throw new InvalidRequestJsonRpcError((err as Error).message, id);
    }
    await this.connectGateway();
    const { channelName, contractName, action, payload, signature } =
      body.params[0];
    const channel = (await this.gateway.getNetwork(channelName)).getChannel();
    const endorsement = channel.newEndorsement(contractName);

    /* eslint-disable no-underscore-dangle */
    (endorsement as unknown as { _payload: Buffer })._payload = Buffer.from(
      payload,
      "base64"
    );
    (endorsement as unknown as { _signature: Buffer })._signature = Buffer.from(
      signature,
      "base64"
    );

    let transientMap: ProposalAction["transientMap"] = {};
    if (action.transientMap) {
      transientMap = JSON.parse(
        JSON.stringify(action.transientMap)
      ) as ProposalAction["transientMap"];
      Object.keys(transientMap).forEach((key) => {
        transientMap[key] = Buffer.from(
          transientMap[key] as unknown as string,
          "base64"
        );
      });
    }

    (endorsement as unknown as { _action: ProposalAction })._action = {
      init: action.init,
      transientMap,
      transactionId: action.transactionId,
      args: action.args.map((arg) => Buffer.from(arg, "base64")),
      fcn: action.fcn,
      header: {
        signature_header: Buffer.from(action.header.signature_header, "base64"),
        channel_header: Buffer.from(action.header.channel_header, "base64"),
      },
      proposal: {
        header: Buffer.from(action.proposal.header, "base64"),
        payload: Buffer.from(action.proposal.payload, "base64"),
      },
    };

    const { responses } = await endorsement.send({
      targets: channel.getEndorsers(),
    });

    const validResponse = responses.find((p) => p.endorsement);
    if (!validResponse) {
      const invalidResponse = responses.find((p) => p.endorsement === null);
      const { message } = invalidResponse.response;
      throw new InvalidRequestJsonRpcError(`Invalid response: ${message}`, id);
    }

    return responses.map((response) => ({
      endorsement: {
        endorser: response.endorsement.endorser.toString("base64"),
        signature: response.endorsement.signature.toString("base64"),
      },
      payload: response.payload.toString("base64"),
      response: {
        status: response.response.status,
        message: response.response.message,
        payload: response.response.payload.toString("base64"),
      },
    }));
  }

  async commitTransaction(
    body: RequestCommitTransactionDto,
    id?: number | string
  ): Promise<string> {
    try {
      await validateClass(RequestCommitTransactionDto, body);
    } catch (err) {
      throw new InvalidRequestJsonRpcError((err as Error).message, id);
    }
    await this.connectGateway();
    const {
      channelName,
      contractName,
      action,
      payload,
      signature,
      transactionId,
    } = body.params[0];
    const network = await this.gateway.getNetwork(channelName);
    const contract = network.getContract(contractName);
    const channel = network.getChannel();
    const transaction = contract.createTransaction("empty");
    const eventHandler = (
      transaction as unknown as {
        eventHandlerStrategyFactory: (
          transactionId: string,
          network: Network
        ) => {
          startListening: () => Promise<void>;
          waitForEvents: () => Promise<void>;
        };
      }
    ).eventHandlerStrategyFactory(transactionId, network);
    await eventHandler.startListening();
    const endorsement = channel.newEndorsement(contractName);
    const commit = endorsement.newCommit();
    (commit as unknown as { _payload: Buffer })._payload = Buffer.from(
      payload,
      "base64"
    );
    (commit as unknown as { _signature: Buffer })._signature = Buffer.from(
      signature,
      "base64"
    );
    (commit as unknown as { _action: CommitAction })._action = {
      init: action.init,
      payload: {
        header: {
          signature_header: Buffer.from(
            action.payload.header.signature_header,
            "base64"
          ),
          channel_header: Buffer.from(
            action.payload.header.channel_header,
            "base64"
          ),
        },
        data: Buffer.from(action.payload.data, "base64"),
      },
    };
    await commit.send({
      targets: channel.getCommitters(),
    });
    await eventHandler.waitForEvents();
    return "OK";
  }
}

export default { FabricService };
