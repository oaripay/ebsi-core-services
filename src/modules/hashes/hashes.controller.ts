import {
  Controller,
  Get,
  Query,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { Param } from "@nestjs/common/decorators/http/route-params.decorator";
import { HashesService } from "./hashes.service";
import {
  HashResponseObject,
  HashesListResponseObject,
} from "./types/hashes.interface";

@Controller("hashes")
export class HashesController {
  private readonly logger = new Logger(HashesController.name);

  constructor(private hashesService: HashesService) {}

  @Get()
  async findAll(
    @Query("page[size]", new DefaultValuePipe(10), ParseIntPipe)
    pageSize?: number
  ): Promise<HashesListResponseObject> {
    this.logger.debug(`find All hashes pagesize:${pageSize}`);
    return this.hashesService.getRecordList(pageSize);
  }

  @Get(":hash")
  async findOne(
    @Param() params: { hash?: string }
  ): Promise<HashResponseObject> {
    this.logger.debug(`find one hash:${params.hash}`);
    return this.hashesService.getRecord(params.hash);
  }
}

export default HashesController;
