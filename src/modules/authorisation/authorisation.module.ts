import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { AuthorisationController } from "./authorisation.controller";
import { AuthorisationService } from "./authorisation.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [AuthorisationController],
  providers: [Logger, AuthorisationService],
})
export class AuthorisationModule {}

export default AuthorisationModule;
