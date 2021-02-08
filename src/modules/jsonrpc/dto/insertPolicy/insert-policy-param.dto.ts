import { IsBase64, IsString, IsEthereumAddress } from "class-validator";

export class InsertPolicyParam {
  @IsEthereumAddress()
  from: string;

  @IsString()
  policyId: string;

  @IsBase64()
  policy: string;
}

export default InsertPolicyParam;
