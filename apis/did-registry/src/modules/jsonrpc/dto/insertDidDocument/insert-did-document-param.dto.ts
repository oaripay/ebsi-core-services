import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidDocument } from "../sendSignedTransaction/index.js";

export class InsertDidDocumentParam extends ArgsInsertDidDocument {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertDidDocumentParam };
