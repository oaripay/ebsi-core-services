import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
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
      return await (
        await this.ledgerService.getContract()
      ).getUsers(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Users Not Found", {
        detail: "Users Not Found",
      });
    }
  }

  async getAllUserAttributes(address: string, page = 1): Promise<string[]> {
    try {
      const userAttributes = await (
        await this.ledgerService.getContract()
      ).getUserAttributes(address, page, 50);
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
        this.logger.error(error);
      }
      throw new NotFoundError("User Attributes Not Found", {
        detail: "User Attributes Not Found",
      });
    }
  }

  async getUser(address: string): Promise<UserResponseObject> {
    try {
      return {
        address,
        attributes: await this.getAllUserAttributes(address),
      };
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e);
      }
      throw new NotFoundError("User Not Found", {
        detail: `User ${address} not found:`,
      });
    }
  }
}

export default UsersService;
