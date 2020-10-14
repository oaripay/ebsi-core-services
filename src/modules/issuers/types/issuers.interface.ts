import { ethers } from "ethers";

export interface AttributeObject {
  hash: string;
  body: string;
}

export interface IssuerResponseObject {
  did: string;
  attributes: AttributeObject[];
}

export interface IssuersListResponseObject {
  self: string;
  items: string[];
  total: number;
  pageSize: number;
  links: {
    first: string;
    prev: string;
    next: string;
    last: string;
  };
}

export interface IssuersListSmartContractResponseObject {
  items: string[];
  total: ethers.BigNumber;
  pageSize: ethers.BigNumber;
  prev: ethers.BigNumber;
  next: ethers.BigNumber;
}

export interface IssuersListSmartContractResponseObjectFormatted {
  items: string[];
  total: number;
  pageSize: number;
  prev: number;
  next: number;
}
