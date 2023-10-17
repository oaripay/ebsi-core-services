import { IsEthereumAddress, IsString } from "class-validator";

export class ArgsDeleteUserAttribute {
  @IsEthereumAddress()
  address!: string;

  @IsString()
  attributeName!: string;
}

export default { ArgsDeleteUserAttribute };
