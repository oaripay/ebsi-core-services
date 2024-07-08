// eslint-disable-next-line import/extensions, import/no-relative-packages
import type { Event as GraphClientEvent } from "../../../.graphclient/index.js";

export interface DidLink {
  did: string;
  href: string;
}

export type Event = Pick<
  GraphClientEvent,
  "id" | "event" | "signer" | "timestamp" | "txId" | "blockNumber"
>;

export interface DidDocumentData {
  didDocument: DidDocument;
}

export interface DidDocumentEventsData {
  didDocument: DidDocumentEvents;
}

export interface DidDocument {
  baseDocument: string;
  id: string;
  isSecp256k1: boolean;
  notAfter: string;
  notBefore: string;
  publicKey: string;
  vMethodId: string;
  controllers: Controller[];
  verificationRelationships: VerificationRelationship[];
  verificationMethods: VerificationMethod[];
}

export type DidDocumentResponse = {
  "@context": string | string[];
  id: string;
  controller: string[];
  verificationMethod: VerificationMethod[];
  publicKey: VerificationMethod[];
} & {
  [x in KeyCapabilitySection]?: (string | VerificationMethod)[];
};

export type KeyCapabilitySection =
  | "authentication"
  | "assertionMethod"
  | "keyAgreement"
  | "capabilityInvocation"
  | "capabilityDelegation";

export interface DidDocumentEvents {
  id: string;
  events: Event[];
}

export interface ControllersArray {
  controllers: Controller[];
}
export interface Controller {
  id: string;
  controller: ControllerData;
  controlledDocument: ControllerData;
  status: string;
}

export interface ControllerData {
  id: string;
}

export interface Documents {
  identifiers: string[];
  prevPageIdentifiers: string[];
  nextPageIdentifiers: string[];
}

export interface Events {
  events: Event[];
  prevPageEvents: Event[];
  nextPageEvents: Event[];
}

export interface VerificationMethod {
  did?: string;
  isSecp256k1: boolean;
  publicKey: string;
  status: string;
  vMethodId: string;
}

export interface VerificationRelationship {
  did?: string;
  name: string;
  notAfter: string;
  notBefore: string;
  vMethodId: string;
  vrId: string;
}

export interface VerificationRelationshipsArray {
  verificationRelationships: VerificationRelationship[];
}
