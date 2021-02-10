import { IsEthereumAddress } from "class-validator";
import { ArgsUpdatePolicy } from "../signedTransaction";

export class UpdatePolicyParam extends ArgsUpdatePolicy {
  @IsEthereumAddress()
  from: string;
}

export default { UpdatePolicyParam };
