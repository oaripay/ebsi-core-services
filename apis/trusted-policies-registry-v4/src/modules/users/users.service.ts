import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";

import type { User_filter } from "../../../.graphclient/index.js";
import type { UserResponseObject } from "./users.interface.js";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async getUser(user: string): Promise<UserResponseObject> {
    try {
      const res = await sdk.GetUser({ user });
      if (!res.user) throw new Error("not found");

      return {
        attributes: res.user.attributes,
        user: res.user.id,
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("User Not Found", {
        detail: `User ${user} not found`,
      });
    }
  }

  async getUsers(
    page = 1,
    pagesize = 10,
    where: User_filter = {},
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      const res = await sdk.GetUsers({ pagesize: queryPageSize, skip, where });
      if (!res.users) return { items: [] };
      const users = res.users.map((u) => u.id);
      return { items: users };
    } catch {
      throw new NotFoundError("Users not found", {
        detail: "Users not found",
      });
    }
  }
}

export default UsersService;
