import { IsEthereumAddress, IsString, IsBase64 } from "class-validator";

export class InsertPolicyParam {
  @IsEthereumAddress()
  from: string;

  @IsString()
  policyId: string;

  @IsBase64()
  policy: string;
}

export default { InsertPolicyParam };
