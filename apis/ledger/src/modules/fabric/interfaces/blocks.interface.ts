import * as fabprotos from "fabric-protos";
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

// https://github.com/hyperledger/fabric-sdk-node/blob/9218b7079c03a1096b2a87a173b994e5c535e2c5/fabric-common/lib/BlockDecoder.js#L29
export interface FabricBlock {
  header?: {
    number?: number | Long;
    data_hash?: Buffer;
    previous_hash?: Buffer;
  };
  data?: {
    data?: FabricTransaction[];
  };
  metadata?: {
    metadata?: [
      {
        value?: Buffer;
        signatures?: unknown;
      },
      unknown,
      [fabprotos.protos.TxValidationCode]
    ];
  };
}
