import { IsEthereumAddress } from "class-validator";
import { ArgsDeleteAppAdministrator } from "../signedTransaction";

export class DeleteAppAdministratorParam extends ArgsDeleteAppAdministrator {
  @IsEthereumAddress()
  from: string;
}

export default { DeleteAppAdministratorParam };
