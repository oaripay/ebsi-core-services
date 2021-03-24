import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateDidDocument } from "../signedTransaction";

export class UpdateDidDocumentParam extends ArgsUpdateDidDocument {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateDidDocumentParam };
