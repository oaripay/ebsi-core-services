import University from "./University";
import Government from "./Government";

export default interface TrustedIssuer {
  issuerDID: string;

  entities: (University | Government)[];
}
