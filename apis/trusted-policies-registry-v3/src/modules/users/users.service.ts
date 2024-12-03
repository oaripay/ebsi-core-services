import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import { LedgerService } from "../ledger/ledger.service.js";
import { UserResponseObject } from "./users.interface.js";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getAllUserAttributes(address: string, page = 1): Promise<string[]> {
    try {
      const userAttributes = await this.ledgerService
        .getContract()
        .getUserAttributes(address, page, 50);
      const nextPage = Number(
        ethers.BigNumber.from(userAttributes.next).toString(),
      );
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

  async getUser(user: string): Promise<UserResponseObject> {
    try {
      return {
        attributes: await this.getAllUserAttributes(user),
        user,
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("User Not Found", {
        detail: `User ${user} not found:`,
      });
    }
  }

  async getUsers(
    page: number,
    pageSize: number,
  ): ReturnType<PolicyRegistry["getUsers"]> {
    try {
      return await this.ledgerService.getContract().getUsers(page, pageSize);
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
