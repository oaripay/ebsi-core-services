export interface DocumentsLink {
  documentId: string;
  href: string;
}

export interface Document {
  metadata: string;
  timestamp: {
    datetime: string;
    source: "block" | "external";
    proof: string; // Either a block number ("block" source) or the hash from transaction input ("external" source)
  };
  events: string[];
  creator: string;
}
