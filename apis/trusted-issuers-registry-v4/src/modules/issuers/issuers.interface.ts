export type IssuerTypeName = "undefined" | "RootTAO" | "TAO" | "TI" | "Revoked";

export enum IssuerType {
  Undefined = 0,
  RootTAO = 1,
  TAO = 2,
  TI = 3,
  Revoked = 4,
}

export const IssuerTypeNames: IssuerTypeName[] = [
  "undefined",
  "RootTAO",
  "TAO",
  "TI",
  "Revoked",
];

export interface AttributeObject {
  hash: string;
  body: string;
  issuerType: "undefined" | "RootTAO" | "TAO" | "TI" | "Revoked";
  tao: string;
  rootTao: string;
}

export interface AttributeDetailsObject {
  did: string;
  attribute: AttributeObject;
}

export interface IssuerResponseObject {
  did: string;
  attributes: AttributeObject[];
}

export interface IssuerProxyResponseObject {
  prefix: string;
  headers: Record<string, string | number | boolean>;
  testSuffix: string;
}

export interface IdLink {
  id: string;
  href: string;
}

export interface DidLink {
  did: string;
  href: string;
}

export interface ProxyLink {
  proxyId: string;
  href: string;
}
