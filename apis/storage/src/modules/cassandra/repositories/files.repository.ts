import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { mapping, types, QueryOptions } from "cassandra-driver";
import { CassandraService } from "../cassandra.service.js";
import { FileModel } from "../models/file.model.js";
import { CASSANDRA_EXCEPTIONS } from "../cassandra.constants.js";

const TABLE_FILE_STORAGE = "file_storage";

@Injectable()
export class FilesRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(FilesRepository.name);

  fileMapper!: mapping.ModelMapper<FileModel>;

  constructor(private cassandraService: CassandraService) {}

  onApplicationBootstrap(): void {
    const mappingOptions: mapping.MappingOptions = {
      models: {
        File: {
          tables: [TABLE_FILE_STORAGE],
          mappings: new mapping.UnderscoreCqlToCamelCaseMappings(),
        },
      },
    };

    this.fileMapper = this.cassandraService
      .createMapper(mappingOptions)
      .forModel("File");
  }

  async getFile({
    did,
    hash,
  }: {
    did: string;
    hash: string;
  }): Promise<FileModel | null> {
    const result = await this.fileMapper.find({ did, hash });
    return result.first();
  }

  async getFiles(
    did: string,
    requestedPageState: string,
    pageSize: number,
  ): Promise<types.ResultSet> {
    const query = `select hash from ${TABLE_FILE_STORAGE} where did = ?`;
    const params = [did];

    const opts: QueryOptions = {
      consistency: this.cassandraService.getConsistency().read,
      prepare: true,
      fetchSize: pageSize,
      ...(requestedPageState && { pageState: requestedPageState }),
    };

    try {
      return await this.cassandraService
        .getClient()
        .execute(query, params, opts);
    } catch (e) {
      this.logger.error((e as Error).message, (e as Error).stack);
      if ((e as Error).message.includes("Invalid value for the paging state")) {
        throw new Error(CASSANDRA_EXCEPTIONS.PAGE_STATE_ERROR);
      }
      throw e;
    }
  }

  async insertFile(file: FileModel): Promise<mapping.Result<FileModel>> {
    return this.fileMapper.insert(file);
  }

  async updateFileMetadata(file: FileModel): Promise<void> {
    const query = `update ${TABLE_FILE_STORAGE} set metadata = ? where did = ? and hash = ?`;
    const params = [file.metadata, file.did, file.hash];

    const opts: QueryOptions = {
      consistency: this.cassandraService.getConsistency().write,
      prepare: true,
    };

    await this.cassandraService.getClient().execute(query, params, opts);
  }

  async deleteFile({
    did,
    hash,
  }: {
    did: string;
    hash: string;
  }): Promise<void> {
    await this.fileMapper.remove({ did, hash });
  }
}

export default FilesRepository;
