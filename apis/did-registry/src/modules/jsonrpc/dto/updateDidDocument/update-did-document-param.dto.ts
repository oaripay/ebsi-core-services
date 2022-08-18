import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateDidDocument } from "../sendSignedTransaction";

export class UpdateDidDocumentParam extends ArgsUpdateDidDocument {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateDidDocumentParam };
