import { IsEthereumAddress, IsString, IsHexadecimal } from "class-validator";
import { IsDid } from "../../validators";

export class InsertAppAdministratorParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  administratorId: string;
}

export default { InsertAppAdministratorParam };
