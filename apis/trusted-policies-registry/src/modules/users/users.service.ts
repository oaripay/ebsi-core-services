import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { LedgerService } from "../ledger/ledger.service";
import { UserResponseObject } from "./users.interface";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getUsers(
    page: number,
    pageSize: number
  ): ReturnType<PolicyRegistry["getUsers"]> {
    return (await this.ledgerService.getContract()).getUsers(page, pageSize);
  }

  async getAllUserAttributes(address: string, page = 1): Promise<string[]> {
    const userAttributes = await (
      await this.ledgerService.getContract()
    ).getUserAttributes(address, page, 50);
    const nextPage = Number(
      ethers.BigNumber.from(userAttributes.next).toString()
    );
    if (nextPage > page) {
      return [
        ...userAttributes.items,
        ...(await this.getAllUserAttributes(address, nextPage)),
      ];
    }
    return userAttributes.items;
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
          const attributeValue = await (
            await this.ledgerService.getContract()
          ).getUserAttribute(address, attributeName);
          user.attributes[attributeName] = attributeValue;
        })
      );
    } catch (e) {
      throw new NotFoundError("User Not Found", {
        detail: `User ${address} not found: ${(e as Error).message}`,
      });
    }

    return user;
  }
}

export default UsersService;
