import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import { UserResponseObject } from "./users.interface.js";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private ledgerService: LedgerService) {}

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

  async getUser(address: string): Promise<UserResponseObject> {
    const user: UserResponseObject = {
      address,
      attributes: {},
    };

    try {
      const userAttributes = await this.getAllUserAttributes(address);
      await Promise.all(
        userAttributes.map(async (attributeName) => {
          const attributeValue = await this.ledgerService
            .getContract()
            .getUserAttribute(address, attributeName);
          user.attributes[attributeName] = attributeValue;
        }),
      );
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("User Not Found", {
        detail: `User ${address} not found:`,
      });
    }

    return user;
  }
}

export default UsersService;
