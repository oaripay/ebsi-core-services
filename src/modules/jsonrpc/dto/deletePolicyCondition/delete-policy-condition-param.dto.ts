import { IsEthereumAddress } from "class-validator";
import { ArgsDeletePolicyCondition } from "../sendSignedTransaction";

export class DeletePolicyConditionParam extends ArgsDeletePolicyCondition {
  @IsEthereumAddress()
  from: string;
}

export default { DeletePolicyConditionParam };
