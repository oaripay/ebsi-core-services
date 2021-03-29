import { IsEthereumAddress } from "class-validator";
import { ArgsAppendDidDocumentVersionHash } from "../signedTransaction";

export class AppendDidDocumentVersionParam extends ArgsAppendDidDocumentVersionHash {
  @IsEthereumAddress()
  from: string;
}

export default { AppendDidDocumentVersionParam };
