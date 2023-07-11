export enum IssuerType {
  Undefined = 0,
  RootTAO = 1,
  TAO = 2,
  TI = 3,
  Revoked = 4,
}

export const IssuerTypeNames = [
  "undefined",
  "RootTAO",
  "TAO",
  "TI",
  "Revoked",
] as const;
