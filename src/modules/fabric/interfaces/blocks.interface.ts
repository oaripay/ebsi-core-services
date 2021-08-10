import { FabricChannelHeader } from "./channels.interface";

export interface Block {
  blockNum: number;
  channelName: string;
  timestamp: string;
  dataHash: string;
  prevHash: string;
  txCount: number;
  txIds: string[];
}

export interface FabricBlock {
  header?: {
    number?: number | Long;
    data_hash?: Buffer;
    previous_hash?: Buffer;
  };
  data?: {
    data?: {
      payload?: {
        header?: {
          channel_header?: FabricChannelHeader;
        };
      };
    }[];
  };
}
