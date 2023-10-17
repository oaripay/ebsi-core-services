import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAppAdministrator } from "../sendSignedTransaction/index.js";

export class InsertAppAdministratorParam extends ArgsInsertAppAdministrator {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertAppAdministratorParam };
