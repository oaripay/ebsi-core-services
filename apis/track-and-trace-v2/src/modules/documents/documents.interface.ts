export interface DocumentsLink {
  documentId: string;
  href: string;
}

export interface Timestamp {
  datetime: string;
  source: "block" | "external";
  proof: string; // Either a block number ("block" source) or the hash from transaction input ("external" source)
}

export interface Document {
  metadata: string;
  timestamp: Timestamp;
  events: string[];
  creator: string;
}

export interface DocumentEventsLink {
  eventId: string;
  href: string;
}

export interface Event {
  externalHash: string;
  hash: string;
  timestamp: Timestamp;
  sender: string;
  origin: string;
  metadata: string;
}

export interface Access {
  /**
   * A `did:ebsi` or `did:key` DID.
   */
  subject: string;

  /**
   * Document ID
   */
  documentId: string;

  /**
   * Permission granted: "write", "delegate" or "creator".
   */
  permission: "write" | "delegate" | "creator";

  /**
   * The `did:ebsi` or `did:key` DID of the granter of the permission.
   * "creator" shall have itself as "grantedBy".
   */
  grantedBy: string;
}

export type DocumentAccesses = Access[];
