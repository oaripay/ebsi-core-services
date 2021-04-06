export interface DidTimestampResponseObject {
  hash: string;
  timestampedBy: string;
  blockNumber: number;
  data: string;
}

export interface TimestampLink {
  timestampId: string;
  href: string;
}
