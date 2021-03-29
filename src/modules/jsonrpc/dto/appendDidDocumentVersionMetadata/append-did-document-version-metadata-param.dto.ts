import { IsEthereumAddress } from "class-validator";
import { ArgsAppendDidDocumentVersionMetadata } from "../signedTransaction";

export class AppendDidDocumentVersionMetadataParam extends ArgsAppendDidDocumentVersionMetadata {
  @IsEthereumAddress()
  from: string;
}

export default { AppendDidDocumentVersionMetadataParam };
