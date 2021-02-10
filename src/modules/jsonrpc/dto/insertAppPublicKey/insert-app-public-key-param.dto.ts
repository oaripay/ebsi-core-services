import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAppPublicKey } from "../signedTransaction";

export class InsertAppPublicKeyParam extends ArgsInsertAppPublicKey {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppPublicKeyParam };
