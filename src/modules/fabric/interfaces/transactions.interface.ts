import { FabricChannelHeader } from "./channels.interface";

export interface Transaction {
  txId: string;
  type: number;
  timestamp: string;
  channelId: string;
  creatorMspId: string;
  blockNum: number;
  actions: {
    chaincodeId: string;
    proposalHash?: string;
    response: unknown;
    endorsersMspId: string[];
    creatorMspId: string;
  }[];
}

export interface FabricAction {
  header?: {
    creator: {
      Mspid?: string;
      id_bytes?: Buffer;
    };
    nonce?: Buffer;
  };
  payload?: {
    chaincode_proposal_payload?: {
      input?: {
        chaincode_spec?: {
          chaincode_id?: {
            name?: string;
          };
        };
      };
    };
    action?: {
      proposal_response_payload?: {
        proposal_hash?: Buffer;
        extension?: {
          results?: {
            data_model?: number;
            ns_rwset?: unknown[];
          };
          events?: {
            chaincode_id?: string;
            tx_id?: string;
            event_name?: string;
            payload?: Buffer;
          };
          response?: {
            status?: number;
            message?: string;
            payload?: Buffer;
          };
          chaincode_id?: {
            path?: string;
            name?: string;
            version?: string;
          };
        };
      };
      endorsements?: {
        endorser?: {
          Mspid?: string;
        };
      }[];
    };
  };
}

export interface FabricTransaction {
  payload?: {
    header?: {
      channel_header?: FabricChannelHeader;
      signature_header?: {
        creator?: {
          Mspid?: string;
        };
      };
    };
    data?: {
      actions?: FabricAction[];
    };
  };
}
