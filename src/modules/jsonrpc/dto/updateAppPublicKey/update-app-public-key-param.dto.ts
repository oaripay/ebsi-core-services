import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAppPublicKey } from "../sendSignedTransaction";

export class UpdateAppPublicKeyParam extends ArgsUpdateAppPublicKey {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateAppPublicKeyParam };
