import { IsEthereumAddress } from "class-validator";
import { ArgsDeletePolicyCondition } from "../sendSignedTransaction/index.js";

export class DeletePolicyConditionParam extends ArgsDeletePolicyCondition {
  @IsEthereumAddress()
  from!: string;
}

export default { DeletePolicyConditionParam };
