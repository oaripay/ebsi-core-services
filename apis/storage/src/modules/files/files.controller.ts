import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  Request,
  Response,
  UseGuards,
  HttpCode,
  ParseArrayPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest, FastifyReply } from "fastify";
import {
  BadRequestError,
  PaginatedList2,
  byteLength,
} from "@ebsiint-api/shared";
import { FilesService } from "./files.service.js";
import { FileMetadata, PostFileResponseObject } from "./files.interface.js";
import { formatFiles } from "./files.formatter.js";
import type { ApiConfig } from "../../config/configuration.js";
import { SiopJwtAuthGuard } from "../auth/guards/index.js";
import { User, type ClientInfo } from "../auth/decorators/index.js";
import {
  DeleteFileParams,
  GetFileParams,
  GetFileMetadataParams,
  GetFilesQuery,
  PatchFileBody,
  PatchFileParams,
  PostFileBody,
} from "./dto/index.js";

@Controller("/stores/distributed/files")
export class FilesController {
  constructor(
    private filesService: FilesService,
    private configService: ConfigService<ApiConfig, true>,
  ) {}

  @HttpCode(200)
  @UseGuards(SiopJwtAuthGuard)
  @Get()
  async getKeys(
    @Query() query: GetFilesQuery,
    @User() user: ClientInfo,
  ): Promise<PaginatedList2<string>> {
    const { did } = user;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const { hashes, pageState } = await this.filesService.getFiles(
      did,
      pageAfter,
      pageSize,
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/stores/distributed/files`;

    // Known issues: because of how Cassandra works, we can only return the "next" link, not other links
    // We don't return the total either, as it would require a separate, time-consuming query
    return formatFiles(hashes, pageAfter, pageState, pageSize, baseUrl);
  }

  @UseGuards(SiopJwtAuthGuard)
  @Get("/:hash")
  async getFile(
    @Param() params: GetFileParams,
    @User() user: ClientInfo,
    @Response() res: FastifyReply,
  ): Promise<FastifyReply> {
    const { hash } = params;
    const { did } = user;

    const { mimetype, filename, data } = await this.filesService.getFile({
      did,
      hash,
    });

    return res
      .code(200)
      .type(mimetype || "application/octet-stream")
      .header(
        "Content-Disposition",
        `attachment; filename=${filename || "unknown"}`,
      )
      .header("Content-Length", byteLength(data))
      .send(data);
  }

  @HttpCode(200)
  @UseGuards(SiopJwtAuthGuard)
  @Get("/:hash/metadata")
  async getFileMetadata(
    @Param() params: GetFileMetadataParams,
    @User() user: ClientInfo,
  ): Promise<FileMetadata> {
    const { hash } = params;
    const { did } = user;

    return this.filesService.getFileMetadata({ did, hash });
  }

  @UseGuards(SiopJwtAuthGuard)
  @Post("")
  @HttpCode(201)
  async postFile(
    @Request() req: FastifyRequest,
    @User() user: ClientInfo,
  ): Promise<PostFileResponseObject> {
    if (!req.isMultipart()) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "This endpoint only accepts multipart/form-data requests",
      });
    }

    const { did } = user;
    const { body } = req as { body: PostFileBody };

    return this.filesService.postFile(did, body);
  }

  @HttpCode(200)
  @UseGuards(SiopJwtAuthGuard)
  @Patch("/:hash")
  async patchFile(
    @Param() params: PatchFileParams,
    @Headers("content-type") contentType: string,
    @Body(new ParseArrayPipe({ items: PatchFileBody })) patch: PatchFileBody[],
    @User() user: ClientInfo,
  ): Promise<FileMetadata> {
    if (contentType !== "application/json-patch+json") {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail:
          "The request's Content-Type must be 'application/json-patch+json'",
      });
    }

    const { hash } = params;
    const { did } = user;

    return this.filesService.patchFile({ did, hash }, patch);
  }

  @HttpCode(204)
  @UseGuards(SiopJwtAuthGuard)
  @Delete("/:hash")
  async deleteFile(
    @Param() params: DeleteFileParams,
    @User() user: ClientInfo,
  ): Promise<void> {
    const { hash } = params;
    const { did } = user;

    await this.filesService.deleteFile({ did, hash });
  }
}

export default FilesController;
