import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidDocument } from "../signedTransaction";

export class InsertDidDocumentParam extends ArgsInsertDidDocument {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidDocumentParam };
