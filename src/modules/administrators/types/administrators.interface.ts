import { ethers } from "ethers";

export interface AttributeObject {
  hash: string;
  body: string;
}

export interface AdministratorResponseObject {
  did: string;
  attributes: AttributeObject[];
}

export interface AdministratorsListResponseObject {
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

export interface AdministratorsListSmartContractResponseObject {
  items: string[];
  total: ethers.BigNumber;
  pageSize: ethers.BigNumber;
  prev: ethers.BigNumber;
  next: ethers.BigNumber;
}

export interface AdministratorsListSmartContractResponseObjectFormatted {
  items: string[];
  total: number;
  pageSize: number;
  prev: number;
  next: number;
}
