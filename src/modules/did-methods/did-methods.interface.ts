export interface DidMethodResponseObject {
  methodName: string;
  ledgerName: string;
  methodSpec: string[];
  methodSpecHash: string[];
  notBefore: number;
  notAfter: number;
  status: number;
}

export interface NameLink {
  name: string;
  href: string;
}
