import { ethers } from "ethers";

export interface AttributeObject {
  hash: string;
  body: string;
}

export interface AdministratorResponseObject {
  did: string;
  attributes: AttributeObject[];
}

export interface PaginatedList<T> {
  self: string;
  items: T[];
  total: number;
  pageSize: number;
  links: {
    first: string;
    prev: string;
    next: string;
    last: string;
  };
}

export interface IdLink {
  id: string;
  href: string;
}

export interface DidLink {
  did: string;
  href: string;
}

export interface AdministratorsListSmartContractResponseObject {
  items: string[];
  total: ethers.BigNumber;
  pageSize: ethers.BigNumber;
  prev: ethers.BigNumber;
  next: ethers.BigNumber;
}
