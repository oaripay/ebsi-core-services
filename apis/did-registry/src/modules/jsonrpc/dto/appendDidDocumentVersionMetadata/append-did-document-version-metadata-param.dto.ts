import { IsEthereumAddress } from "class-validator";
import { ArgsAppendDidDocumentVersionMetadata } from "../sendSignedTransaction/index.js";

export class AppendDidDocumentVersionMetadataParam extends ArgsAppendDidDocumentVersionMetadata {
  @IsEthereumAddress()
  from!: string;
}

export default { AppendDidDocumentVersionMetadataParam };
