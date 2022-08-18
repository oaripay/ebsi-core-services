import { CanActivate, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class FabricEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<ApiConfig>) {}

  canActivate(): boolean {
    const { enabled } = this.configService.get<ApiConfig["fabric"]>("fabric");

    if (!enabled) {
      throw new NotFoundError();
    }

    return true;
  }
}

export default FabricEnabledGuard;
