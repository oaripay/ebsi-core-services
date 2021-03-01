import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSmartContractName } from "../signedTransaction";

export class UpdateSmartContractNameParam extends ArgsUpdateSmartContractName {
  @IsEthereumAddress()
  from: string;
}

export default { ArgsUpdateSmartContractName };
