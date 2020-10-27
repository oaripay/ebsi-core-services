import { ethers } from "ethers";

export interface AttributeObject {
  hash: string;
  body: string;
}

export interface AttributeDetailsObject {
  did: string;
  attribute: AttributeObject;
}

export interface IssuerResponseObject {
  did: string;
  attributes: AttributeObject[];
}

export interface IdLink {
  id: string;
  href: string;
}

export interface DidLink {
  did: string;
  href: string;
}

export interface IssuersListSmartContractResponseObject {
  items: string[];
  total: ethers.BigNumber;
  pageSize: ethers.BigNumber;
  prev: ethers.BigNumber;
  next: ethers.BigNumber;
}
