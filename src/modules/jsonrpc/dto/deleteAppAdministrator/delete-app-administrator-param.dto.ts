import { IsEthereumAddress, IsHexadecimal } from "class-validator";
import { IsDid } from "../../validators";

export class DeleteAppAdministratorParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  administratorId: string;
}

export default { DeleteAppAdministratorParam };
