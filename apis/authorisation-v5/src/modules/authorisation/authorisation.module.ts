import { Module, Logger } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthorisationController } from "./authorisation.controller.js";
import { AuthorisationService } from "./authorisation.service.js";

@Module({
  imports: [ApiConfigModule, CacheModule.register()],
  controllers: [AuthorisationController],
  providers: [Logger, AuthorisationService],
})
export class AuthorisationModule {}

export default AuthorisationModule;
