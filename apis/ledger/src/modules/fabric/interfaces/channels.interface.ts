export interface FabricChannelHeader {
  type?: number;
  version?: number;
  timestamp?: string;
  channel_id?: string;
  tx_id?: string;
  epoch?: Long;
  extension?: Buffer;
  typeString?: string;
}
