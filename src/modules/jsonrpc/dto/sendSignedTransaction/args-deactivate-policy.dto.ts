import { IsNumberString } from "class-validator";

export class ArgsDeactivatePolicy {
  @IsNumberString()
  policyId: string;
}

export default { ArgsDeactivatePolicy };
