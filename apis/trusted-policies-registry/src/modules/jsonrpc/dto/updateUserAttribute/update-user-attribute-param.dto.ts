import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateUserAttribute } from "../sendSignedTransaction/index.js";

export class UpdateUserAttributeParam extends ArgsUpdateUserAttribute {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateUserAttributeParam };
