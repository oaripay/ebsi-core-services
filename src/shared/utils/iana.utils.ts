import multihash from "multihashes";

export const supportedIanaNames = [
  "sha-256",
  "sha-512",
  "sha3-224",
  "sha3-256",
  "sha3-384",
  "sha3-512",
] as const;

export type IanaName = typeof supportedIanaNames[number];

const ianaMultihashMap: Record<IanaName, multihash.HashName> = {
  "sha-256": "sha2-256",
  "sha-512": "sha2-512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
};

export const isSupportedIanaName = (ianaName: string): boolean =>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  supportedIanaNames.includes(ianaName);

export const ianaNameToMultihashName = (iana: IanaName): multihash.HashName => {
  return ianaMultihashMap[iana];
};
