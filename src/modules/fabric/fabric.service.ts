import fs from "fs";
import path from "path";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Gateway, GatewayOptions, Wallets, X509Identity } from "fabric-network";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import * as fabprotos from "fabric-protos";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore fabric-common doesn't expose the TS definition correctly - https://github.com/hyperledger/fabric-sdk-node/pull/477
import { BlockData, BlockDecoder } from "fabric-common";
import { Block, FabricChannelHeader, ConnectionProfile } from "./interfaces";
import { ApiConfig } from "../../config/configuration";

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
    const blockQueryResult = await this.executeQuery(
      channelName,
      "qscc", // Query System Chaincode
      "GetBlockByNumber",
      [channelName, blockIndex]
    );

    // Hopefully fabric-common will provide the correct defintions 🤞
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const decodedBlock = BlockDecoder.decode(
      blockQueryResult
    ) as fabprotos.common.Block; // warning: not exact

    const timestamp =
      (
        (decodedBlock.data.data[0] as unknown as BlockData).payload.header as {
          channel_header?: FabricChannelHeader;
        }
      )?.channel_header?.timestamp ?? "";

    const txIds = (decodedBlock.data?.data as unknown as BlockData[])
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
      dataHash:
        (decodedBlock.header.data_hash as Buffer)?.toString("hex") ?? "",
      prevHash:
        (decodedBlock.header.previous_hash as Buffer)?.toString("hex") ?? "",
      txCount: txIds.length,
      txIds,
    };

    return block;
  }

  async getChannelBlocks(
    channelName: string,
    pageAfter: number,
    pageSize: number
  ): Promise<{ blocks: Block[]; total: number }> {
    const blockChannelResult = await this.executeQuery(
      channelName,
      "qscc", // Query System Chaincode
      "GetChainInfo",
      [channelName]
    );

    const channelResultJson =
      fabprotos.common.BlockchainInfo.decode(blockChannelResult);

    const numberOfBlocks =
      typeof channelResultJson.height === "number"
        ? channelResultJson.height
        : channelResultJson.height.toInt();

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
}

export default { FabricService };
