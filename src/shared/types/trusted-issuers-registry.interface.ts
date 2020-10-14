import { IssuersListSmartContractResponseObject } from "../../modules/issuers/types/issuers.interface";

export default interface TrustedIssuersRegistryContract {
  getIssuers: (
    page: number,
    howMany: number
  ) => Promise<IssuersListSmartContractResponseObject>;

  getIssuer: (did: string) => Promise<string[]>;

  getIssuerAttributebyHash: (
    hash: string
  ) => Promise<{
    did: string;
    attribData: string;
  }>;

  getIssuerAttributeHistory: (anyAttrVersHash: string) => Promise<string[]>;
}
