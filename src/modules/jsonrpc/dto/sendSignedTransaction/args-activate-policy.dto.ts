import { IsNumberString } from "class-validator";

export class ArgsActivatePolicy {
  @IsNumberString()
  policyId: string;
}

export default { ArgsActivatePolicy };
