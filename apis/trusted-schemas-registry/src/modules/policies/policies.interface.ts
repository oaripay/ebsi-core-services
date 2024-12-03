export interface PolicyLink {
  href: string;
  policyId: string;
}

export interface PolicyResponseObject {
  hash: string;
  policy: string;
  policyId: string;
}

export interface PolicyRevisions {
  items: {
    hash: string;
    policy: string;
    policyId: string;
  }[];
  total: number;
}
