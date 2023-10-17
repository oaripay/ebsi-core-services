import { IsEthereumAddress } from "class-validator";
import { ArgsDetachDidDocumentVersionHash } from "../sendSignedTransaction/index.js";

export class DetachDidDocumentVersionParam extends ArgsDetachDidDocumentVersionHash {
  @IsEthereumAddress()
  from!: string;
}

export default { DetachDidDocumentVersionParam };
