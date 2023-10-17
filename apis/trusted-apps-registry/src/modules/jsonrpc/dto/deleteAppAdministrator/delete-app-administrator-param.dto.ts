import { IsEthereumAddress } from "class-validator";
import { ArgsDeleteAppAdministrator } from "../sendSignedTransaction/index.js";

export class DeleteAppAdministratorParam extends ArgsDeleteAppAdministrator {
  @IsEthereumAddress()
  from!: string;
}

export default { DeleteAppAdministratorParam };
