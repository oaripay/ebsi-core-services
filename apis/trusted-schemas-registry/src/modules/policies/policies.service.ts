import type { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";

import {
  generateMultihash,
  isEthersError,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { SchemaSCRegistry__factory } from "@ebsiint-sc/trusted-schemas-registry";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.ts";
import type { PolicyRevisions } from "./policies.interface.ts";

import { LedgerService } from "../ledger/ledger.service.ts";

@Injectable()
export class PoliciesService {
  private readonly contract: SchemaSCRegistry;

  private readonly ledgerService: LedgerService;

  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    ledgerService: LedgerService,
  ) {
    this.ledgerService = ledgerService;
    const contractAddress = configService.get("contractAddr", {
      infer: true,
    });
    this.contract = SchemaSCRegistry__factory.connect(contractAddress);
  }

  async getPolicies(
    page: number,
    pageSize: number,
  ): ReturnType<SchemaSCRegistry["getPolicies"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getPolicies(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Policies Not Found", {
        detail: `Policies not found`,
      });
    }
  }

  async getPolicy(policyId: string): Promise<[string, string]> {
    const provider = this.ledgerService.getProvider();

    let policy: Awaited<ReturnType<SchemaSCRegistry["getPolicy"]>>;

    try {
      // Preserve case! Don't lowercase the policyId
      policy = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getPolicy(policyId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const [rawPolicy, rawPolicyHash] = policy;

    const base64Policy = Buffer.from(remove0xPrefix(rawPolicy), "hex").toString(
      "base64",
    );

    // Compute multihash from hash
    const multihash = generateMultihash(rawPolicyHash);
    return [base64Policy, multihash];
  }

  async getPolicyRevisions(
    policyId: string,
    page: number,
    pageSize: number,
  ): Promise<PolicyRevisions> {
    const provider = this.ledgerService.getProvider();

    let revisions: Awaited<ReturnType<SchemaSCRegistry["getPolicyRevisions"]>>;

    try {
      revisions = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getPolicyRevisions(policyId, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Policy Not Found", {
        detail: `Policy ${policyId} not found`,
      });
    }

    const contract = this.contract
      // @ts-expect-error Error due to CommonJS vs ESM modules imports
      .connect(provider);
    const getPoliciesByRevisions = revisions.items.map((hash) =>
      contract.getPolicyByHash(hash),
    );

    let policies: Awaited<ReturnType<SchemaSCRegistry["getPolicyByHash"]>>[];

    try {
      policies = await Promise.all(getPoliciesByRevisions);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Revisions not found", {
        detail: `Revisions for ${policyId} not found`,
      });
    }

    return {
      items: revisions.items.map((hash, index) => ({
        hash,
        policy: policies[index]!,
        policyId,
      })),
      total: Number(revisions.total),
    };
  }
}
