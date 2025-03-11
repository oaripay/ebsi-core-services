import { IsEthereumAddress, IsString } from "class-validator";

export class GetSubjectPolicyParams {
  @IsString()
  policyName!: string;

  @IsEthereumAddress()
  subject!: string;
}

export default GetSubjectPolicyParams;
