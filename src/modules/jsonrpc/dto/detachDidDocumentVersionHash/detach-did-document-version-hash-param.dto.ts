import { IsEthereumAddress } from "class-validator";
import { ArgsDetachDidDocumentVersionHash } from "../signedTransaction";

export class DetachDidDocumentVersionParam extends ArgsDetachDidDocumentVersionHash {
  @IsEthereumAddress()
  from: string;
}

export default { DetachDidDocumentVersionParam };
