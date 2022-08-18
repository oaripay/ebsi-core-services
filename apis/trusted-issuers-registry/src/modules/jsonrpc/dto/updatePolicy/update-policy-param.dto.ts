import { IsEthereumAddress } from "class-validator";
import { ArgsUpdatePolicy } from "../sendSignedTransaction";

export class UpdatePolicyParam extends ArgsUpdatePolicy {
  @IsEthereumAddress()
  from: string;
}

export default UpdatePolicyParam;
