import { ethers } from "ethers";

export interface PolicyResponseObject {
  policyId: string;
  policy: string;
  hash: string;
}

export interface PolicyLink {
  policyId: string;
  href: string;
}

export interface PoliciesListSmartContractResponseObject {
  items: string[];
  total: ethers.BigNumber;
  pageSize: ethers.BigNumber;
  prev: ethers.BigNumber;
  next: ethers.BigNumber;
}
