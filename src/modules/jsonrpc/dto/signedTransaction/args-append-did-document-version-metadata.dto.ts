import { Matches } from "class-validator";
import { IsHexadecimalDid, IsHexadecimalJson } from "../../validators";

export class ArgsAppendDidDocumentVersionMetadata {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDid()
  identifier: string;

  // Stringified JSON DID Document (hex-encoded)
  @IsHexadecimalJson()
  @Matches(/^0x/)
  didVersionInfo: string;

  // Stringified JSON metadata (hex-encoded)
  @IsHexadecimalJson()
  @Matches(/^0x/)
  didVersionMetadata: string;
}

export default { ArgsAppendDidDocumentVersionMetadata };
