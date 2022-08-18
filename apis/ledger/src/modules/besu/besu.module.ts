import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { BesuController } from "./besu.controller";
import { BesuService } from "./besu.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [BesuController],
  providers: [Logger, BesuService],
})
export class BesuModule {}

export default BesuModule;
