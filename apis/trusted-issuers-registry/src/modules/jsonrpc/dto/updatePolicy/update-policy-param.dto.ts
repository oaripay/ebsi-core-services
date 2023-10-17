import { IsEthereumAddress } from "class-validator";
import { ArgsUpdatePolicy } from "../sendSignedTransaction/index.js";

export class UpdatePolicyParam extends ArgsUpdatePolicy {
  @IsEthereumAddress()
  from!: string;
}

export default UpdatePolicyParam;
