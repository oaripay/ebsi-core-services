import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSmartContractInfoById } from "../sendSignedTransaction";

export class UpdateSmartContractInfoByIdParam extends ArgsUpdateSmartContractInfoById {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateSmartContractInfoByIdParam };
