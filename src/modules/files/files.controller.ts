import { Controller, Post, Request, UseGuards, HttpCode } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest } from "fastify";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { FilesService } from "./files.service";
import { PostFileResponseObject } from "./files.interface";
import { ApiConfig } from "../../config/configuration";
import { JwtAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";
import { PostFileBody } from "./dto";

@Controller("/stores/distributed/files")
export class FilesController {
  constructor(
    private filesService: FilesService,
    private configService: ConfigService<ApiConfig>
  ) {}

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
}

export default FilesController;
