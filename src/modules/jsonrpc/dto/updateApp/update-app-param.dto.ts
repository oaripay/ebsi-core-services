import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateApp } from "../signedTransaction";

export class UpdateAppParam extends ArgsUpdateApp {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateAppParam };
