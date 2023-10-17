import { IsEthereumAddress } from "class-validator";
import { ArgsDeleteUserAttribute } from "../sendSignedTransaction/index.js";

export class DeleteUserAttributeParam extends ArgsDeleteUserAttribute {
  @IsEthereumAddress()
  from!: string;
}

export default { DeleteUserAttributeParam };
