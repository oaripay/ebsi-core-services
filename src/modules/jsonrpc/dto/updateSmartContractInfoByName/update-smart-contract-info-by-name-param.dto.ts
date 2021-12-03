import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSmartContractInfoByName } from "../sendSignedTransaction";

export class UpdateSmartContractInfoByNameParam extends ArgsUpdateSmartContractInfoByName {
  @IsEthereumAddress()
  from: string;
}

export default { ArgsUpdateSmartContractInfoByName };
