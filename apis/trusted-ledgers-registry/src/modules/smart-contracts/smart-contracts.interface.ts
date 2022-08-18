export interface GetSmartContractsResponse {
  smartContractInfoId: string;
  href: string;
}

export interface GetRevisionsResponse {
  revisionHash: string;
  href: string;
}

export interface SmartContractInfoIdsList {
  items: string[];
  total: number;
}

export interface RevisionsList {
  items: string[];
  total: number;
}
