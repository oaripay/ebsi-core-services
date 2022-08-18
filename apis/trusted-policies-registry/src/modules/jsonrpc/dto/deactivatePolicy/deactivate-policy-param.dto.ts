import { IsEthereumAddress } from "class-validator";
import { ArgsDeactivatePolicy } from "../sendSignedTransaction";

export class DeactivatePolicyParam extends ArgsDeactivatePolicy {
  @IsEthereumAddress()
  from: string;
}

export default { DeactivatePolicyParam };
