import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAppPublicKey } from "../sendSignedTransaction/index.js";

export class UpdateAppPublicKeyParam extends ArgsUpdateAppPublicKey {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateAppPublicKeyParam };
