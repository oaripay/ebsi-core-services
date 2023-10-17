import { IssuerTypeNames } from "./issuers.constants.js";

export type IssuerTypeName = (typeof IssuerTypeNames)[number];

export interface AttributeObject {
  hash: string;
  body: string;
  issuerType: IssuerTypeName;
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
