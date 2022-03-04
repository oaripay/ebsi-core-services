import { IsEthereumAddress } from "class-validator";
import { ArgsDeleteUserAttribute } from "../sendSignedTransaction";

export class DeleteUserAttributeParam extends ArgsDeleteUserAttribute {
  @IsEthereumAddress()
  from: string;
}

export default { DeleteUserAttributeParam };
