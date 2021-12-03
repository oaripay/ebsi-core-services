import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSmartContractName } from "../sendSignedTransaction";

export class UpdateSmartContractNameParam extends ArgsUpdateSmartContractName {
  @IsEthereumAddress()
  from: string;
}

export default { ArgsUpdateSmartContractName };
