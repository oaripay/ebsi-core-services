import { IsEthereumAddress, IsBase64, IsString } from "class-validator";

export class UpdatePolicyParam {
  @IsEthereumAddress()
  from: string;

  @IsString()
  policyId: string;

  @IsBase64()
  policy: string;
}

export default UpdatePolicyParam;
