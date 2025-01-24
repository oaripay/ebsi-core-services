import type { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";

import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.js";
import type { UserResponseObject } from "./users.interface.js";

import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export class UsersService {
  private readonly contract: PolicyRegistry;

  private readonly logger = new Logger(UsersService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    const contractAddress = configService.get("contractAddr", { infer: true });
    this.contract = PolicyRegistry__factory.connect(contractAddress);
  }

  async getAllUserAttributes(address: string, page = 1): Promise<string[]> {
    const provider = this.ledgerService.getProvider();

    try {
      const userAttributes = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getUserAttributes(address, page, 50);
      const nextPage = Number(BigInt(userAttributes.next).toString());
      if (nextPage > page) {
        return [
          ...userAttributes.items,
          ...(await this.getAllUserAttributes(address, nextPage)),
        ];
      }
      return userAttributes.items;
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("User Attributes Not Found", {
        detail: "User Attributes Not Found",
      });
    }
  }

  async getUser(address: string): Promise<UserResponseObject> {
    const user: UserResponseObject = {
      address,
      attributes: {},
    };

    const provider = this.ledgerService.getProvider();

    try {
      const userAttributes = await this.getAllUserAttributes(address);
      await Promise.all(
        userAttributes.map(async (attributeName) => {
          const attributeValue = await this.contract
            // @ts-expect-error Error due to CommonJS vs ESM modules imports
            .connect(provider)
            .getUserAttribute(address, attributeName);
          user.attributes[attributeName] = attributeValue;
        }),
      );
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("User Not Found", {
        detail: `User ${address} not found:`,
      });
    }

    return user;
  }

  async getUsers(
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getUsers"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getUsers(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Users Not Found", {
        detail: "Users Not Found",
      });
    }
  }
}

export default UsersService;
