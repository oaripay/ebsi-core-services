import Issuer from "./Issuer";
import DocumentInfo from "./DocumentInfo";
import Accreditation from "./Accreditation";

export default class TrustedIssuer extends Issuer {
  preferredName?: string;

  alternativeName?: string;

  homepage?: string;

  escoOrganizationType?: string;

  siteLocation?: string;

  name?: string;

  country?: string;

  documents: DocumentInfo[];

  accreditations?: Accreditation[];
}
