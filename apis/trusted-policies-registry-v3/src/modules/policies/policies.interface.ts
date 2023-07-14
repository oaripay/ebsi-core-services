export interface PolicyResponseObject {
  policyId: string;
  description: string;
  policyName: string;
  status: boolean;
}

export interface PolicyLink {
  policyName: string;
  href: string;
}
