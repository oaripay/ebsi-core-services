import { FabricTransaction } from "./transactions.interface";

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
    data?: FabricTransaction[];
  };
}
