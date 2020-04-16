export const JWT_ALG = "ES256K-R";
export const DID_FORMAT = /^did:([a-zA-Z0-9_]+):([:[a-zA-Z0-9_.-]+)(\/[^#]*)?(#.*)?$/;
export const JWT_FORMAT = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
export const DEFAULT_ALL_CONTEXT = "https://www.w3.org/2018/credentials/v1";
export const DEFAULT_EIDAS_CONTEXT =
  "https://EBSI-WEBSITE.EU/schemas/eidas/2019/v1#";
export const DEFAULT_ESSIF_CONTEXT =
  "https://EBSI-WEBSITE.EU/schemas/vc/2019/v1#";
export const DEFAULT_ATTESTATION_TYPE = "VerifiableCredential";
export const DEFAULT_VERIFIABLEID_TYPE = "EssifVerifiableID";
export const DEFAULT_DIPLOMA_TYPE = "EuropassCredential";
export const DEFAULT_PRESENTATION_TYPE = "VerifiablePresentation";
export const FLEMISH_BACHELORS_DIPLOMA_ID =
  "https://app.ebsi.xyz/diploma/flemish-gov/credentials/bachelor-diploma-va";
export const SPANISH_UNIV_MASTERS_DIPLOMA_ID =
  "https://app.ebsi.xyz/diploma/spanish-university/credentials/masters-diploma-va";
export const EIDAS_ID = "ebsi:type-version-of-the-credential";
export const TERMS_OF_USE = "To Be Defined";
export const DEFAULT_EIDAS_PROOF_TYPE = "EidasSeal2019";
export const DEFAULT_PROOF_TYPE = "EcdsaSecp256k1Signature2019";
export const DEFAULT_PROOF_PURPOSE = "assertionMethod";
export const DEFAULT_EIDAS_VERIFICATION_METHOD = "#eidasKey";
export const DEFAULT_TERMS_OF_USE = "Terms of Use sample: TBD";
export const DEFAULT_VID_TYPE_TEXT = "Verifiable ID";
export const DEFAULT_DIPLOMA_TYPE_TEXT = "Europass Diploma";
export const BELGIUM_GOVE_NAME = "Belgium Government";
export const FLANDES_GOV_NAME = "Flemish Government";
export const SPANISH_UNIV_NAME = "Rovira i Virgili University";
