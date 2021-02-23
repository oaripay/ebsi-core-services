import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Request,
  Response,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest, FastifyReply } from "fastify";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { FilesService } from "./files.service";
import { FileMetadata, PostFileResponseObject } from "./files.interface";
import { formatFiles } from "./files.formatter";
import { ApiConfig } from "../../config/configuration";
import { JwtAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";
import {
  DeleteFileParams,
  GetFileParams,
  GetFileMetadataParams,
  GetFilesQuery,
  PostFileBody,
} from "./dto";
import { PaginatedList } from "../../shared/interfaces";
import { byteLength } from "../../shared/utils";

@Controller("/stores/distributed/files")
export class FilesController {
  constructor(
    private filesService: FilesService,
    private configService: ConfigService<ApiConfig>
  ) {}

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Get()
  async getKeys(
    @Query() query: GetFilesQuery,
    @User() user: UserInfo
  ): Promise<PaginatedList<string>> {
    const { did } = user;
    const pageAfter = query["page[after]"];
    const pageSize = query["page[size]"];

    const { hashes, pageState } = await this.filesService.getFiles(
      did,
      pageAfter,
      pageSize
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/stores/distributed/files`;

    // Known issues: because of how Cassandra works, we can only return the "next" link, not other links
    // We don't return the total either, as it would require a separate, time-consuming query
    return formatFiles(hashes, pageAfter, pageState, pageSize, baseUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/:hash")
  async getFile(
    @Param() params: GetFileParams,
    @User() user: UserInfo,
    @Response() res: FastifyReply
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
        `attachment; filename=${filename || "unknown"}`
      )
      .header("Content-Length", byteLength(data))
      .send(data);
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Get("/:hash/metadata")
  async getFileMetadata(
    @Param() params: GetFileMetadataParams,
    @User() user: UserInfo
  ): Promise<FileMetadata> {
    const { hash } = params;
    const { did } = user;

    return this.filesService.getFileMetadata({ did, hash });
  }

  @UseGuards(JwtAuthGuard)
  @Post("")
  @HttpCode(201)
  async postFile(
    @Request() req: FastifyRequest,
    @User() user: UserInfo
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

  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @Delete("/:hash")
  async deleteFile(
    @Param() params: DeleteFileParams,
    @User() user: UserInfo
  ): Promise<void> {
    const { hash } = params;
    const { did } = user;

    await this.filesService.deleteFile({ did, hash });
  }
}

export default FilesController;
