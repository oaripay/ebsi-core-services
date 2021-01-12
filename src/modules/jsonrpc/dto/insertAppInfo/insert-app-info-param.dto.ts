import { IsEthereumAddress, IsHexadecimal, IsObject } from "class-validator";

export class InsertAppInfoParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  applicationId: string;

  @IsObject()
  info: {
    [x: string]: unknown;
  };
}

export default { InsertAppInfoParam };
