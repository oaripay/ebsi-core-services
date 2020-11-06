import { AdministratorsListSmartContractResponseObject } from "../../modules/administrators/administrators.interface";
import { IssuersListSmartContractResponseObject } from "../../modules/issuers/issuers.interface";
import { PoliciesListSmartContractResponseObject } from "../../modules/policies/policies.interface";

export default interface TrustedIssuersRegistryContract {
  getAdministrators: (
    page: number,
    howMany: number
  ) => Promise<AdministratorsListSmartContractResponseObject>;

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
  ) => Promise<{
    items: string[];
    total: number;
    howMany: number;
    prev: number;
    next: number;
  }>;

  getIssuers: (
    page: number,
    howMany: number
  ) => Promise<IssuersListSmartContractResponseObject>;

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
  ) => Promise<{
    items: string[];
    total: number;
    howMany: number;
    prev: number;
    next: number;
  }>;

  getPolicies: (
    page: number,
    howMany: number
  ) => Promise<PoliciesListSmartContractResponseObject>;

  getPolicy: (policyId: string) => Promise<string>;
}
