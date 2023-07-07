import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ArgsRollVerificationMethodDetails } from "./args-roll-verification-method-details.dto";

export class ArgsRollVerificationMethod {
  @ValidateNested()
  @Type(() => ArgsRollVerificationMethodDetails)
  rollArgs!: ArgsRollVerificationMethodDetails;
}

export default { ArgsRollVerificationMethod };
