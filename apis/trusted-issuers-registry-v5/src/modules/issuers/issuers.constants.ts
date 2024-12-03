export enum IssuerType {
  Revoked = 4,
  RootTAO = 1,
  TAO = 2,
  TI = 3,
  Undefined = 0,
}

export const IssuerTypeNames = [
  "undefined",
  "RootTAO",
  "TAO",
  "TI",
  "Revoked",
] as const;
