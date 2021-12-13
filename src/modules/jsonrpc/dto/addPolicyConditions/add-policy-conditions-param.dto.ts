import { IsEthereumAddress } from "class-validator";
import { ArgsAddPolicyConditions } from "../sendSignedTransaction";

export class AddPolicyConditionsParam extends ArgsAddPolicyConditions {
  @IsEthereumAddress()
  from: string;
}

export default { AddPolicyConditionsParam };
