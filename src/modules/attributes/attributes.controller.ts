import {
  Controller,
  Response,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  Param,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply } from "fastify";
import crypto from "crypto";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { AttributesService } from "./attributes.service";
import { AttributeResponseObject } from "./attributes.interface";
import { ApiConfig } from "../../config/configuration";
import { JwtAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";
import { AttributeBodyDto, AttributeHashDto } from "./dto";

@Controller("/attributes")
export default class AttributesController {
  constructor(
    private attributesService: AttributesService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("/")
  async insertAttribute(
    @Body() body: AttributeBodyDto,
    @User() user: UserInfo,
    @Response() res: FastifyReply
  ): Promise<AttributeResponseObject> {
    const hash = `0x${crypto
      .createHash("sha256")
      .update(body.data)
      .digest("hex")}`;

    if (user.did !== body.did) {
      throw new BadRequestError("DID Mismatch", {
        detail: `DID Mismatch: The did of the Bearer token (${user.did}) must be equal to the did in the attribute (${body.did})`,
      });
    }

    if (await this.attributesService.existAttribute(hash, body.did)) {
      const updatedAttribute = await this.attributesService.updateAttribute(
        hash,
        body
      );
      return res.code(200).type("application/json").send(updatedAttribute);
    }

    const attribute = await this.attributesService.insertAttribute(hash, body);
    return res.code(201).type("application/json").send(attribute);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Delete("/:hash")
  async deleteAttribute(
    @Param() params: AttributeHashDto,
    @User() user: UserInfo
  ): Promise<void> {
    const { hash } = params;
    if (!(await this.attributesService.existAttribute(hash, user.did))) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} for did ${user.did} not found`,
      });
    }
    await this.attributesService.deleteAttribute(hash, user.did);
  }
}
