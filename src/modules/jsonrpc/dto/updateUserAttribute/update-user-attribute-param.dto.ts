import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateUserAttribute } from "../sendSignedTransaction";

export class UpdateUserAttributeParam extends ArgsUpdateUserAttribute {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateUserAttributeParam };
