import { CacheModule } from "@nestjs/cache-manager";
import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { AuthorisationController } from "./authorisation.controller.js";
import { AuthorisationService } from "./authorisation.service.js";

@Module({
  controllers: [AuthorisationController],
  imports: [ApiConfigModule, CacheModule.register()],
  providers: [Logger, AuthorisationService],
})
export class AuthorisationModule {}

export default AuthorisationModule;
