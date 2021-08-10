export interface Block {
  blockNum: number;
  channelName: string;
  timestamp: string;
  dataHash: string;
  prevHash: string;
  txCount: number;
  txIds: string[];
}
