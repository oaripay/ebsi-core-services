import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { DidTimestampsController } from "./did-timestamps.controller";
import { DidTimestampsService } from "./did-timestamps.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [DidTimestampsController],
  providers: [Logger, DidTimestampsService, ContractService],
})
export class DidTimestampsModule {}

export default DidTimestampsModule;
