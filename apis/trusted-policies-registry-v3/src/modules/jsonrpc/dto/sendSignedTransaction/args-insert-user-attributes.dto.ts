import { IsEthereumAddress, IsArray } from "class-validator";

export class ArgsInsertUserAttributes {
  @IsEthereumAddress()
  address!: string;

  @IsArray()
  attributes!: string[];
}

export default { ArgsInsertUserAttributes };
