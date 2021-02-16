import {
  Controller,
  Response,
  Put,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply } from "fastify";
import { KeyValuesService } from "./key-values.service";
import { PutKeyValueParams } from "./dto";
import { ApiConfig } from "../../config/configuration";
import { JwtAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";

@Controller("/stores/distributed/key-values")
export class KeyValuesController {
  constructor(
    private keyValuesService: KeyValuesService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @UseGuards(JwtAuthGuard)
  @Put("/:key")
  async putKeyValue(
    @Param() params: PutKeyValueParams,
    @Body() value: string,
    @User() user: UserInfo,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const { key } = params;
    const { did } = user;

    const { keyValue, isNew } = await this.keyValuesService.putKeyValue(
      key,
      value,
      did
    );

    return res
      .code(isNew ? 201 : 200)
      .type("application/json")
      .send(keyValue);
  }
}

export default KeyValuesController;
