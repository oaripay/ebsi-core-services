import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAppPublicKey } from "../signedTransaction";

export class UpdateAppPublicKeyParam extends ArgsUpdateAppPublicKey {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateAppPublicKeyParam };
