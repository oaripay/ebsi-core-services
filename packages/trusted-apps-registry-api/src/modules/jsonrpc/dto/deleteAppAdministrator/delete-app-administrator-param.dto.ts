import { IsEthereumAddress } from "class-validator";
import { ArgsDeleteAppAdministrator } from "../sendSignedTransaction";

export class DeleteAppAdministratorParam extends ArgsDeleteAppAdministrator {
  @IsEthereumAddress()
  from: string;
}

export default { DeleteAppAdministratorParam };
