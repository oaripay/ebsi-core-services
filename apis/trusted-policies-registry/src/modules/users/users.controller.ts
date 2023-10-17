import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginationQuery, PaginatedList } from "@ebsiint-api/shared";
import { UsersService } from "./users.service.js";
import { formatUsers } from "./users.formatter.js";
import { UserLink, UserResponseObject } from "./users.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { GetUserParams } from "./dto/index.js";

@Controller("/users")
export class UsersController {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @Get("")
  async getUsers(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedList<UserLink>> {
    const users = await this.usersService.getUsers(
      query["page[after]"],
      query["page[size]"],
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/users`;

    return formatUsers(
      users,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
    );
  }

  @Get("/:address")
  async getUser(@Param() params: GetUserParams): Promise<UserResponseObject> {
    return this.usersService.getUser(params.address);
  }
}

export default UsersController;
