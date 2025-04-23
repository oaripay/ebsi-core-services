import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { Accepts } from "@ebsiint-api/shared";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { User_filter } from "../../../.graphclient/index.js";
import type { ApiConfig } from "../../config/configuration.ts";
import type { UserLink, UserResponseObject } from "./users.interface.ts";

import { GetUserParams, GetUsersQuery } from "./dto/index.ts";
import { formatUsers } from "./users.formatter.ts";
import { UsersService } from "./users.service.ts";

@Controller("/users")
export class UsersController {
  private readonly usersService: UsersService;
  private readonly configService: ConfigService<ApiConfig, true>;

  constructor(
    usersService: UsersService,
    configService: ConfigService<ApiConfig, true>,
  ) {
    this.usersService = usersService;
    this.configService = configService;
  }

  @Accepts("application/json")
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

    const apiUrlPrefix = this.configService.get("apiUrlPrefix", {
      infer: true,
    });
    const domain = this.configService.get("domain", { infer: true });
    const baseUrl = `${domain}${apiUrlPrefix}/users`;

    const searchParams = new URLSearchParams();
    for (const k of Object.keys(query)) {
      const key = k as keyof GetUsersQuery;
      if (
        query[key] !== undefined &&
        key !== "page[after]" &&
        key !== "page[size]"
      ) {
        searchParams.append(key, query[key]);
      }
    }
    const extraQuery =
      searchParams.size > 0 ? `&${searchParams.toString()}` : "";

    return formatUsers(
      users,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      extraQuery,
    );
  }

  @Accepts("application/json")
  @Get("/:user")
  async getUser(@Param() params: GetUserParams): Promise<UserResponseObject> {
    return this.usersService.getUser(params.user);
  }
}
