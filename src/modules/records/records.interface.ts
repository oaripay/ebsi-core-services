export interface RecordLink {
  recordId: string;
  href: string;
}

export interface RecordResponseObject {
  ownerIds: string[];
  revokedOwnerIds: string[];
  firstVersionTimestamps: string[];
  lastVersionTimestamps: string[];
  totalVersions: number;
}
