import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAppAdministrator } from "../signedTransaction";

export class InsertAppAdministratorParam extends ArgsInsertAppAdministrator {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppAdministratorParam };
