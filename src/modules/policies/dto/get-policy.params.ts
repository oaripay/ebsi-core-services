import { IsNumberString } from "class-validator";

export class GetPolicyParams {
  @IsNumberString()
  policyId: string;
}

export default GetPolicyParams;
