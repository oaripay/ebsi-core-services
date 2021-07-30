import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfig } from "../../config/configuration";
import { channels } from "./connectionProfile";

@Injectable()
export class FabricService {
  private readonly logger = new Logger(FabricService.name);

  constructor(private configService: ConfigService<ApiConfig>) {}

  getChannels(): string[] {
    const channelsNames = Object.keys(channels);
    return channelsNames;
  }
}

export default { FabricService };
