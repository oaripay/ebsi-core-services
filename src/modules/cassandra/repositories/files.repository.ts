import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mapping } from "cassandra-driver";
import { CassandraService } from "../cassandra.service";
import { FileModel } from "../models/file.model";
import { ApiConfig } from "../../../config/configuration";

const TABLE_FILE_STORAGE = "file_storage";

@Injectable()
export class FilesRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(FilesRepository.name);

  fileMapper: mapping.ModelMapper<FileModel>;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private cassandraService: CassandraService
  ) {}

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
  }): Promise<FileModel> {
    const result = await this.fileMapper.find({ did, hash });
    return result.first();
  }

  async insertFile(file: FileModel): Promise<mapping.Result<FileModel>> {
    return this.fileMapper.insert(file);
  }
}

export default FilesRepository;
