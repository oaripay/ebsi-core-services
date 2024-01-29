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
