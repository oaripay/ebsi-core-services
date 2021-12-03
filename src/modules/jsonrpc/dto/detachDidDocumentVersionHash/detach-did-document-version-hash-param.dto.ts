import { IsEthereumAddress } from "class-validator";
import { ArgsDetachDidDocumentVersionHash } from "../sendSignedTransaction";

export class DetachDidDocumentVersionParam extends ArgsDetachDidDocumentVersionHash {
  @IsEthereumAddress()
  from: string;
}

export default { DetachDidDocumentVersionParam };
