import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAdministrator } from "../sendSignedTransaction";

export class UpdateAdministratorParam extends ArgsUpdateAdministrator {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateAdministratorParam };
