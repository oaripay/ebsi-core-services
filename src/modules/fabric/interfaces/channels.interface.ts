export interface FabricChannelHeader {
  type: string;
  version: number;
  timestamp: string;
  channel_id: string;
  tx_id: string;
  epoch: number;
}
