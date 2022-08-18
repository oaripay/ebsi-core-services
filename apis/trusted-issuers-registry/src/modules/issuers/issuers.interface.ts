export interface AttributeObject {
  hash: string;
  body: string;
}

export interface AttributeDetailsObject {
  did: string;
  attribute: AttributeObject;
}

export interface IssuerResponseObject {
  did: string;
  attributes: AttributeObject[];
}

export interface IdLink {
  id: string;
  href: string;
}

export interface DidLink {
  did: string;
  href: string;
}
