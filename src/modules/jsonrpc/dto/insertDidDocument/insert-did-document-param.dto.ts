import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidDocument } from "../sendSignedTransaction";

export class InsertDidDocumentParam extends ArgsInsertDidDocument {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidDocumentParam };
