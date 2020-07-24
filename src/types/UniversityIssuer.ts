import Issuer from "./Issuer";

export default interface UniversityIssuer extends Issuer {
  preferredName: string;

  alternativeName: string;

  homepage: string;

  siteLocation: string;

  escoOrganizationType: string;
}
