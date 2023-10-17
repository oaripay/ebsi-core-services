import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthorisationController } from "./authorisation.controller.js";
import { AuthorisationService } from "./authorisation.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [AuthorisationController],
  providers: [Logger, AuthorisationService],
})
export class AuthorisationModule {}

export default AuthorisationModule;
