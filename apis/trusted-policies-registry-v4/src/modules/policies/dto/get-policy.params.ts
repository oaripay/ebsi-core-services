import { IsString } from "class-validator";

export class GetPolicyParams {
  @IsString()
  policyName!: string;
}

export default GetPolicyParams;
