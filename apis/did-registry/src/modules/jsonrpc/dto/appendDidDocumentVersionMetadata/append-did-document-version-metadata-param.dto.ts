import { IsEthereumAddress } from "class-validator";
import { ArgsAppendDidDocumentVersionMetadata } from "../sendSignedTransaction";

export class AppendDidDocumentVersionMetadataParam extends ArgsAppendDidDocumentVersionMetadata {
  @IsEthereumAddress()
  from: string;
}

export default { AppendDidDocumentVersionMetadataParam };
