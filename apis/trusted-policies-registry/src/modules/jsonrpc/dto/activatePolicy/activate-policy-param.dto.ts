import { IsEthereumAddress } from "class-validator";
import { ArgsActivatePolicy } from "../sendSignedTransaction/index.js";

export class ActivatePolicyParam extends ArgsActivatePolicy {
  @IsEthereumAddress()
  from!: string;
}

export default { ActivatePolicyParam };
