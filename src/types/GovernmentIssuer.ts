import Issuer from "./Issuer";

export default interface GovernmentIssuer extends Issuer {
  name: string;

  country: string;
}
