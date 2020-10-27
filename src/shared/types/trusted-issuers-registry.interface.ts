import { AdministratorsListSmartContractResponseObject } from "../../modules/administrators/administrators.interface";
import { IssuersListSmartContractResponseObject } from "../../modules/issuers/issuers.interface";

export default interface TrustedIssuersRegistryContract {
  getAdministrators: (
    page: number,
    howMany: number
  ) => Promise<AdministratorsListSmartContractResponseObject>;

  getAdministrator: (did: string) => Promise<string[]>;

  getAdministratorAttributebyHash: (
    hash: string
  ) => Promise<{
    did: string;
    attribData: string;
  }>;

  getAdministratorAttributeHistory: (
    anyAttrVersHash: string
  ) => Promise<string[]>;

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
