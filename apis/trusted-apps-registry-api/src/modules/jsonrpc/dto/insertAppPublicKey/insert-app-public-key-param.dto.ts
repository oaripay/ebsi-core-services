import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAppPublicKey } from "../sendSignedTransaction";

export class InsertAppPublicKeyParam extends ArgsInsertAppPublicKey {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppPublicKeyParam };
