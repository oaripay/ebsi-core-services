import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { mapping } from "cassandra-driver";
import { CassandraService } from "../cassandra.service.js";
import { AppUsageModel } from "../models/app-usage.model.js";

const TABLE_APP_USAGE = "app_usage";

@Injectable()
export class AppUsageRepository implements OnApplicationBootstrap {
  appUsageMapper!: mapping.ModelMapper<AppUsageModel>;

  constructor(private cassandraService: CassandraService) {}

  onApplicationBootstrap(): void {
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

  async getAppUsage(did: string): Promise<AppUsageModel | null> {
    const result = await this.appUsageMapper.find({ did });
    return result.first();
  }

  async insertAppUsage(
    appUsage: AppUsageModel,
  ): Promise<mapping.Result<AppUsageModel>> {
    return this.appUsageMapper.insert(appUsage);
  }

  async updateAppUsage(
    appUsage: AppUsageModel,
  ): Promise<mapping.Result<AppUsageModel>> {
    return this.appUsageMapper.update(appUsage);
  }

  async setAppUsage(
    appUsage: AppUsageModel,
    isNewAppUsage: boolean,
  ): Promise<mapping.Result<AppUsageModel>> {
    return isNewAppUsage
      ? this.insertAppUsage(appUsage)
      : this.updateAppUsage(appUsage);
  }
}

export default AppUsageRepository;
