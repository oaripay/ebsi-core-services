import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import LedgerService from "../../shared/services/ledger.service";
import { PoliciesListSmartContractResponseObject } from "./policies.interface";
import TrustedIssuersRegistryContract from "../../shared/types/trusted-issuers-registry.interface";
import { generateMultihash } from "../../shared/utils/multihash.utils";

@Injectable()
export default class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  private tirContract: TrustedIssuersRegistryContract;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tirContract = (this.ledgerService.getContract() as unknown) as TrustedIssuersRegistryContract;
  }

  async getPolicies(
    page: number,
    pageSize: number
  ): Promise<PoliciesListSmartContractResponseObject> {
    return this.tirContract.getPolicies(page, pageSize);
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    try {
      // Preserve case! Don't lowercase the policyId
      const policyResponse = await this.tirContract.getPolicy(policyId);

      const [rawPolicy, rawPolicyHash] = policyResponse;

      // Return ["", ""] means "no policy found"
      if (rawPolicy === "0x") return ["", ""];

      const base64Policy = Buffer.from(rawPolicy.slice(2), "hex").toString(
        "base64"
      );

      // Compute multihash from hash
      const multihash = generateMultihash(rawPolicyHash);
      return [base64Policy, multihash];
    } catch (e) {
      return ["", ""];
    }
  }
}
