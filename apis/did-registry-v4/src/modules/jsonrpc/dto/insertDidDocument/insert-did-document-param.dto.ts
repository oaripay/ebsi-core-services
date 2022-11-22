import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidDocument } from "./args-insert-did-document.dto";

export class InsertDidDocumentParam extends ArgsInsertDidDocument {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidDocumentParam };
