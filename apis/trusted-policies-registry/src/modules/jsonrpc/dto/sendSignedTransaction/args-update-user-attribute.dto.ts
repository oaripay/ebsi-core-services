import { IsEthereumAddress, IsString } from "class-validator";

export class ArgsUpdateUserAttribute {
  @IsEthereumAddress()
  address: string;

  @IsString()
  attributeName: string;

  @IsString()
  attributeValue: string;
}

export default { ArgsUpdateUserAttribute };
