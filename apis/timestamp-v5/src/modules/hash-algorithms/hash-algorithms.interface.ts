export interface HashAlgorithmLink {
  hashAlgorithmId: number;
  href: string;
}

export interface HashAlgorithmResponseObject {
  outputLengthBits: number;
  ianaName: string;
  oid: string;
  status: "undefined" | "active" | "revoked";
  multihash: string;
}
