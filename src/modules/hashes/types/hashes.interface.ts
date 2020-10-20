import { ethers, EventFilter } from "ethers";

export interface HashResponseObject {
  hash: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  registeredBy: string;
}

export interface HashesListResponseObject {
  self: string;
  items: HashResponseObject[];
  total: number;
  pageSize: number;
  links: {
    first: string;
    prev: string;
    next: string;
    last: string;
  };
}

export interface RecEvent {
  lastBlockREC: number;
  logRec: ethers.providers.Log;
}

export interface JrpcProvider {
  getLogs(
    filter: ethers.providers.Filter
  ): Promise<Array<ethers.providers.Log>>;

  getBlock: (height: number) => Promise<ethers.providers.Block>;
}

export interface NotaryContract {
  lastBlockREC: () => Promise<number>;
  filters: { REC: (hash?: string) => ethers.EventFilter };
  queryFilter(
    event: EventFilter,
    fromBlockOrBlockhash?: ethers.providers.BlockTag | string,
    toBlock?: ethers.providers.BlockTag
  ): Promise<Array<ethers.providers.Log>>;
  record: (hash: string) => Promise<string>;
}
