import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAdministrator } from "../sendSignedTransaction";

export class InsertAdministratorParam extends ArgsInsertAdministrator {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAdministratorParam };
