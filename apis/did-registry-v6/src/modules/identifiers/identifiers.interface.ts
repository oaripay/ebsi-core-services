import type { Event as GraphClientEvent } from "../../../.graphclient/index.js";

export interface Controller {
  controlledDocument: ControllerData;
  controller: ControllerData;
  id: string;
  status: string;
}

export interface ControllerData {
  id: string;
}

export interface ControllersArray {
  controllers: Controller[];
}

export interface DidDocument {
  baseDocument: string;
  controllers: Controller[];
  id: string;
  isSecp256k1: boolean;
  notAfter: string;
  notBefore: string;
  publicKey: string;
  verificationMethods: VerificationMethod[];
  verificationRelationships: VerificationRelationship[];
  vMethodId: string;
}

export interface DidDocumentData {
  didDocument: DidDocument;
}

export interface DidDocumentEvents {
  events: Event[];
  id: string;
}

export interface DidDocumentEventsData {
  didDocument: DidDocumentEvents;
}

export type DidDocumentResponse = Partial<
  Record<KeyCapabilitySection, (string | VerificationMethod)[]>
> & {
  "@context": string | string[];
  controller: string[];
  id: string;
  publicKey: VerificationMethod[];
  verificationMethod: VerificationMethod[];
};

export interface DidLink {
  did: string;
  href: string;
}
export type Event = Pick<
  GraphClientEvent,
  "blockNumber" | "event" | "id" | "signer" | "timestamp" | "txId"
>;

export interface JsonRpcResponseObject {
  error?: unknown;
  id: null | number | string;
  jsonrpc: string;
  result: unknown;
}

export type KeyCapabilitySection =
  | "assertionMethod"
  | "authentication"
  | "capabilityDelegation"
  | "capabilityInvocation"
  | "keyAgreement";

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
