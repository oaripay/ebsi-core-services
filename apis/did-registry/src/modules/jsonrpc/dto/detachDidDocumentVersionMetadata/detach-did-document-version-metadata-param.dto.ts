import { IsEthereumAddress } from "class-validator";
import { ArgsDetachDidDocumentVersionMetadata } from "../sendSignedTransaction/index.js";

export class DetachDidDocumentVersionMetadataParam extends ArgsDetachDidDocumentVersionMetadata {
  @IsEthereumAddress()
  from!: string;
}

export default { DetachDidDocumentVersionMetadataParam };
