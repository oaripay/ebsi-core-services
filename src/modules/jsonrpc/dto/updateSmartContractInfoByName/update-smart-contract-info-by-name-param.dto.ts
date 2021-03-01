import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSmartContractInfoByName } from "../signedTransaction";

export class UpdateSmartContractInfoByNameParam extends ArgsUpdateSmartContractInfoByName {
  @IsEthereumAddress()
  from: string;
}

export default { ArgsUpdateSmartContractInfoByName };
