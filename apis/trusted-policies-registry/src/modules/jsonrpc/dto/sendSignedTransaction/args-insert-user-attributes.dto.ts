import { IsEthereumAddress, IsArray } from "class-validator";

export class ArgsInsertUserAttributes {
  @IsEthereumAddress()
  address: string;

  @IsArray()
  attributeNames: string[];

  @IsArray()
  attributeValues: string[];
}

export default { ArgsInsertUserAttributes };
