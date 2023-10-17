import { IsEthereumAddress } from "class-validator";
import { ArgsDeactivatePolicy } from "../sendSignedTransaction/index.js";

export class DeactivatePolicyParam extends ArgsDeactivatePolicy {
  @IsEthereumAddress()
  from!: string;
}

export default { DeactivatePolicyParam };
