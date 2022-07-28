export interface VerificationEvidenceType {
  value: string;
}

export interface VerificationEvidenceDocumentType {
  essential: boolean;
  value: string[];
}

export interface VerificationEvidenceDocumentCredentialSchemaId {
  essential: boolean;
  value: string;
}
export interface VerificationEvidenceDocumentCredentialSchema {
  id: VerificationEvidenceDocumentCredentialSchemaId;
}
export interface VerificationEvidenceDocument {
  type: VerificationEvidenceDocumentType;
  credentialSchema: VerificationEvidenceDocumentCredentialSchema;
}

export interface VerificationEvidence {
  type: VerificationEvidenceType;
  document: VerificationEvidenceDocument;
}

export interface Verification {
  trust_framework: string;
  evidence: VerificationEvidence;
}

export interface VerifiedClaim {
  verification: Verification;
}

export interface ClaimRequest {
  verified_claims: VerifiedClaim;
}

export interface JsonWebKey {
  alg?: string;
  crv?: string;
  e?: string;
  ext?: boolean;
  key_ops?: string[];
  kid?: string;
  kty: string;
  n?: string;
  use?: string;
  x?: string;
  y?: string;
}

export default Verification;
