import { Injectable, Logger } from "@nestjs/common";
import { isEthersError, NotFoundError } from "@ebsiint-api/shared";
import { UserResponseObject } from "./users.interface.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async getUsers(page = 1, pagesize = 10): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      const res = await sdk.getUsers({ skip, pagesize: queryPageSize });
      const users = res.users.map((u) => u.id);
      return { items: users };
    } catch (error) {
      throw new NotFoundError("Users not found", {
        detail: "Users not found",
      });
    }
  }

  async getUser(user: string): Promise<UserResponseObject> {
    try {
      const res = await sdk.getUser({ user });
      if (!res.user) throw new Error("not found");

      return {
        user: res.user.id,
        attributes: res.user.attributes,
      };
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e);
      }
      throw new NotFoundError("User Not Found", {
        detail: `User ${user} not found`,
      });
    }
  }
}

export default UsersService;
