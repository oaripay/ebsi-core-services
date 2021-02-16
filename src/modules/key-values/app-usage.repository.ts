/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { mapping } from "cassandra-driver";
import { CassandraService } from "../cassandra/cassandra.service";
import { AppUsageModel } from "./models/app-usage.model";

const TABLE_APP_USAGE = "app_usage";

@Injectable()
export class AppUsageRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppUsageRepository.name);

  appUsageMapper: mapping.ModelMapper<AppUsageModel>;

  constructor(private cassandraService: CassandraService) {}

  onApplicationBootstrap() {
    const mappingOptions: mapping.MappingOptions = {
      models: {
        AppUsage: {
          tables: [TABLE_APP_USAGE],
          mappings: new mapping.UnderscoreCqlToCamelCaseMappings(),
        },
      },
    };

    this.appUsageMapper = this.cassandraService
      .createMapper(mappingOptions)
      .forModel("AppUsage");
  }

  async getAppUsage(did: string) {
    const result = await this.appUsageMapper.find({ did });
    return result.first();
  }

  async insertAppUsage(did: string, numberBytes: string) {
    const doc = {
      did,
      numberBytes,
    };

    return this.appUsageMapper.insert(doc);
  }

  async updateAppUsage(did: string, numberBytes: string) {
    const doc = {
      did,
      numberBytes,
    };

    return this.appUsageMapper.update(doc);
  }
}

export default AppUsageRepository;
