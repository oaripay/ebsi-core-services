import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedListWithoutTotal } from "@ebsiint-api/shared";
import { UsersService } from "./users.service.js";
import { formatUsers } from "./users.formatter.js";
import { UserLink, UserResponseObject } from "./users.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetUserParams, GetUsersQuery } from "./dto/index.js";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import { User_filter } from "../../../.graphclient/index.js";

@Controller("/users")
export class UsersController {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getUsers(
    @Query() query: GetUsersQuery,
  ): Promise<PaginatedListWithoutTotal<UserLink>> {
    const where: User_filter = {
      ...(query.attribute && {
        attributes_contains: [query.attribute],
      }),
    };

    const users = await this.usersService.getUsers(
      query["page[after]"],
      query["page[size]"],
      where,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/users`;

    let extraQuery = "";
    if (query.attribute) extraQuery += `&attribute=${query.attribute}`;

    return formatUsers(
      users,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Get("/:user")
  async getUser(@Param() params: GetUserParams): Promise<UserResponseObject> {
    return this.usersService.getUser(params.user);
  }
}

export default UsersController;
