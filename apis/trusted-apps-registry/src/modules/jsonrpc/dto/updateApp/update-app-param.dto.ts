import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateApp } from "../sendSignedTransaction/index.js";

export class UpdateAppParam extends ArgsUpdateApp {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateAppParam };
