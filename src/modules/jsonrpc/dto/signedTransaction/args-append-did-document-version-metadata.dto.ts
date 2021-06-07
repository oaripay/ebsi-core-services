import { Matches, Validate } from "class-validator";
import { IsHexadecimalDidRule, IsHexadecimalJson } from "../../validators";

export class ArgsAppendDidDocumentVersionMetadata {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @Validate(IsHexadecimalDidRule)
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
