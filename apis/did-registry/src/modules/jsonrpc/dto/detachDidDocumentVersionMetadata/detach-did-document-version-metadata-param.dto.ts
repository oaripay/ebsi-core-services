import { IsEthereumAddress } from "class-validator";
import { ArgsDetachDidDocumentVersionMetadata } from "../sendSignedTransaction";

export class DetachDidDocumentVersionMetadataParam extends ArgsDetachDidDocumentVersionMetadata {
  @IsEthereumAddress()
  from: string;
}

export default { DetachDidDocumentVersionMetadataParam };
