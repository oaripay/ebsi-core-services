import fs from "fs";
import path from "path";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Gateway, GatewayOptions, Wallets, X509Identity } from "fabric-network";
import {
  InternalServerError,
  NotFoundError,
  ProblemDetailsError,
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
import { encodeMultibase64url } from "./fabric.utils";

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
    };

    const gateway = new Gateway();

    try {
      await gateway.connect(this.connectionProfile, gatewayOptions);
      this.gateway = gateway;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: `Ledger API gateway could not connect to Hyperledger Fabric ledger`,
      });
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
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: `Query to Hyperledger Fabric ledger failed: ${
          (error as Error).message
        }`,
      });
    }

    if (!queryResult) {
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Query to Hyperledger Fabric result is empty",
      });
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
      // Unknown error
      if (!(e instanceof ProblemDetailsError)) {
        this.logger.error(e);
        throw new InternalServerError();
      }

      if (e.detail.includes("Entry not found in index")) {
        throw new NotFoundError(NotFoundError.defaultTitle, {
          detail: `Block ${blockIndex} not found`,
        });
      }

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
        // Unknown error
        if (!(e instanceof ProblemDetailsError)) {
          this.logger.error(e);
          throw new InternalServerError();
        }

        if (e.detail.includes("Entry not found in index")) {
          throw new NotFoundError(NotFoundError.defaultTitle, {
            detail: `Block ${blockIndex} not found`,
          });
        }

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
      // Unknown error
      if (!(e instanceof ProblemDetailsError)) {
        this.logger.error(e);
        throw new InternalServerError();
      }

      if (e.detail.includes("Entry not found in index")) {
        throw new NotFoundError(NotFoundError.defaultTitle, {
          detail: `Transaction ${transactionId} not found`,
        });
      }

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
}

export default { FabricService };
