import { IsEthereumAddress, IsBase64, IsString } from "class-validator";

export default class Param {
  @IsEthereumAddress()
  from: string;

  @IsString()
  policyId: string;

  @IsBase64()
  policy: string;
}
