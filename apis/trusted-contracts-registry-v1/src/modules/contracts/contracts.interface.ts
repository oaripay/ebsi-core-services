export interface Contract {
  address: string;
  deployer: string;
  deploymentTimestamp: number;
  isActive: boolean;
  issuerDID: string;
  templateId: string;
}

export interface ContractsLink {
  address: string;
  href: string;
}
