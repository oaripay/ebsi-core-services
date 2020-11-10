import { ethers } from "ethers";

type PaginatedSCResponse<T> = {
  items: T[];
  total: ethers.BigNumber;
  howMany: ethers.BigNumber;
  prev: ethers.BigNumber;
  next: ethers.BigNumber;
};

export interface TrustedIssuersRegistryContract {
  getAdministrators: (
    page: number,
    howMany: number
  ) => Promise<PaginatedSCResponse<string>>;

  getAdministrator: (did: string) => Promise<string[]>;

  getAdministratorAttributeByHash: (
    hash: string
  ) => Promise<{
    did: string;
    attribData: string;
  }>;

  getAdministratorAttributeRevisions: (
    anyAttrVersHash,
    page: number,
    pageSize: number
  ) => Promise<PaginatedSCResponse<string>>;

  getIssuers: (
    page: number,
    howMany: number
  ) => Promise<PaginatedSCResponse<string>>;

  getIssuer: (did: string) => Promise<string[]>;

  getIssuerAttributeByHash: (
    hash: string
  ) => Promise<{
    did: string;
    attribData: string;
  }>;

  getIssuerAttributeRevisions: (
    anyAttrVersHash,
    page: number,
    pageSize: number
  ) => Promise<PaginatedSCResponse<string>>;

  getPolicies: (
    page: number,
    howMany: number
  ) => Promise<PaginatedSCResponse<string>>;

  getPolicy: (policyId: string) => Promise<[hexPolicy: string, hash: string]>;

  getPolicyRevisions: (
    policyId: string,
    page: number,
    pageSize: number
  ) => Promise<PaginatedSCResponse<string>>;

  getPolicyByHash: (revisionHash: string) => Promise<string>;
}

export default TrustedIssuersRegistryContract;
