import { IsEthereumAddress } from "class-validator";
import { ArgsAppendDidDocumentVersionHash } from "../sendSignedTransaction";

export class AppendDidDocumentVersionHashParam extends ArgsAppendDidDocumentVersionHash {
  @IsEthereumAddress()
  from: string;
}

export default { AppendDidDocumentVersionHashParam };
