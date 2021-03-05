export interface GetLedgersResponse {
  ledgerInfoId: string;
  href: string;
}

export interface GetRevisionsResponse {
  revisionHash: string;
  href: string;
}

export interface LedgerInfoIdsList {
  items: string[];
  total: number;
}

export interface RevisionsList {
  items: string[];
  total: number;
}
