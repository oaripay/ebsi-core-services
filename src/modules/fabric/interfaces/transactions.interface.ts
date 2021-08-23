import * as fabprotos from "fabric-protos";
import { FabricChannelHeader } from "./channels.interface";

export interface Transaction {
  txId: string;
  type: string;
  timestamp: string;
  channelId: string;
  creatorMspId: string;
  blockNum?: number;
  validationCode: fabprotos.protos.TxValidationCode;
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
    creator?: {
      mspid?: string;
      id_bytes?: Buffer;
    };
    nonce?: Buffer;
  };
  payload?: {
    chaincode_proposal_payload?: {
      input?: {
        chaincode_spec?: {
          type?: number;
          typeString?: string;
          input?: {
            args?: Buffer[];
            decorations?: unknown;
            is_init?: boolean;
          };
          chaincode_id?: {
            name?: string;
          };
          timeout?: number;
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
          mspid?: string;
          id_bytes?: Buffer;
        };
        signature?: Buffer;
      }[];
    };
  };
}

export interface FabricTransaction {
  signature?: Buffer;
  payload?: {
    header?: {
      channel_header?: FabricChannelHeader;
      signature_header?: {
        creator?: {
          mspid?: string;
          id_bytes?: Buffer;
        };
        nonce?: Buffer;
      };
    };
    data?: {
      actions?: FabricAction[];
    };
  };
}
