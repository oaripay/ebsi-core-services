import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { HashAlgorithmsController } from "./hash-algorithms.controller";
import { HashAlgorithmsService } from "./hash-algorithms.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [HashAlgorithmsController],
  providers: [Logger, HashAlgorithmsService, ContractService],
})
export class HashAlgorithmsModule {}

export default HashAlgorithmsModule;
