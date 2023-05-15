import { Matches } from "class-validator";
import {
  IsHexadecimalDidRule,
  IsHexadecimalJson,
  IsHexadecimalJsonLdDidDocument,
} from "../../validators";

export class ArgsAppendDidDocumentVersionMetadata {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDidRule()
  identifier: string;

  // Stringified JSON DID document (hex-encoded)
  @IsHexadecimalJsonLdDidDocument()
  @Matches(/^0x/)
  didVersionInfo: string;

  // Stringified JSON metadata (hex-encoded)
  @IsHexadecimalJson()
  @Matches(/^0x/)
  didVersionMetadata: string;
}

export default { ArgsAppendDidDocumentVersionMetadata };
