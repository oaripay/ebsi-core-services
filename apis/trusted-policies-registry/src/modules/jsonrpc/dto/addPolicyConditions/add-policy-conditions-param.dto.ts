import { IsEthereumAddress } from "class-validator";
import { ArgsAddPolicyConditions } from "../sendSignedTransaction/index.js";

export class AddPolicyConditionsParam extends ArgsAddPolicyConditions {
  @IsEthereumAddress()
  from!: string;
}

export default { AddPolicyConditionsParam };
