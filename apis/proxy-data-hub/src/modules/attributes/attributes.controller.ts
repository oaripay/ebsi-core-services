import crypto from "node:crypto";
import {
  Controller,
  Response,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  Param,
  Query,
  ParseArrayPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply } from "fastify";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { AttributesService } from "./attributes.service";
import { AttributeResponseObject } from "./attributes.interface";
import { ApiConfig } from "../../config/configuration";
import { JwtAuthGuard, JwtOptionalAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";
import {
  AttributeBodyDto,
  AttributeHashDto,
  GetAttributesDto,
  PatchAttributeBody,
} from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { formatAttributes } from "./attributes.formatter";
import { multihashEncode } from "../../shared/utils";

@Controller("/attributes")
export default class AttributesController {
  constructor(
    private attributesService: AttributesService,
    private configService: ConfigService<ApiConfig, true>
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("/")
  async insertAttribute(
    @Body() body: AttributeBodyDto,
    @User() user: UserInfo,
    @Response() res: FastifyReply
  ): Promise<AttributeResponseObject> {
    if (user.did !== body.did) {
      throw new BadRequestError("DID Mismatch", {
        detail: `DID Mismatch: The did of the Bearer token (${user.did}) must be equal to the did in the attribute (${body.did})`,
      });
    }

    const hash = multihashEncode(
      crypto
        .createHash("sha3-256")
        .update(`${body.data}${body.did}`)
        .digest("hex"),
      "sha3-256"
    );

    if (await this.attributesService.getDidByAttributeHash(hash)) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Attribute already exist",
      });
    }

    const attribute = await this.attributesService.insertAttribute(hash, body);
    return res.code(201).type("application/json").send(attribute);
  }

  @UseGuards(JwtAuthGuard)
  @Get("")
  async getAttributes(
    @User() user: UserInfo,
    @Query() query: GetAttributesDto
  ): Promise<PaginatedList<AttributeResponseObject>> {
    const currentPage = query["page[after]"];
    const pageSize = query["page[size]"];

    const { attributes, pageAfter: nextPage } =
      await this.attributesService.getAttributes(
        user.did,
        currentPage,
        pageSize
      );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/attributes`;

    return formatAttributes(
      attributes,
      currentPage,
      nextPage,
      pageSize,
      baseUrl
    );
  }

  @UseGuards(JwtOptionalAuthGuard)
  @Get("/:hash")
  async getAttribute(
    @Param() params: AttributeHashDto,
    @User() user: UserInfo
  ): Promise<AttributeResponseObject> {
    const attribute = await this.attributesService.getAttribute(params.hash);
    const { visibility } = attribute;
    const did = attribute.did ?? "";
    const sharedWith = attribute.sharedWith ?? "";

    if (
      did !== user.did &&
      (visibility !== "shared" ||
        (visibility === "shared" &&
          sharedWith !== "" &&
          sharedWith !== user.did))
    ) {
      throw new ForbiddenError(ForbiddenError.defaultTitle);
    }
    return attribute;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Delete("/:hash")
  async deleteAttribute(
    @Param() params: AttributeHashDto,
    @User() user: UserInfo
  ): Promise<void> {
    const { hash } = params;

    const did = await this.attributesService.getDidByAttributeHash(hash);

    if (!did) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} not found`,
      });
    }

    if (did !== user.did) {
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: `${user.did} is not the owner of attribute ${hash}`,
      });
    }

    await this.attributesService.deleteAttribute(hash);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("/:hash")
  async patchAttribute(
    @Param() params: AttributeHashDto,
    @Body(new ParseArrayPipe({ items: PatchAttributeBody }))
    patch: PatchAttributeBody[],
    @User() user: UserInfo
  ): Promise<AttributeResponseObject> {
    // verify visibility
    if (
      patch.find(
        (p) =>
          p.path === "/visibility" &&
          p.value !== "" &&
          p.value !== "private" &&
          p.value !== "shared"
      )
    ) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `visibility must be 'private', 'shared', or ''`,
      });
    }

    return this.attributesService.patchAttribute(params.hash, user.did, patch);
  }
}
