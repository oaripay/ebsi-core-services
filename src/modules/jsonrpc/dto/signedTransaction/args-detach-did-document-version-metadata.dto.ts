import {
  IsHexadecimalDid,
  IsHexadecimalJson,
  IsHexadecimalJsonLd,
} from "../../validators";

export class ArgsDetachDidDocumentVersionMetadata {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDid()
  identifier: string;

  // Stringified JSON-LD DID Document(hex-encoded)
  @IsHexadecimalJsonLd()
  didVersionInfo: string;

  // Stringified JSON (hex-encoded)
  @IsHexadecimalJson()
  didVersionMetadata: string;
}

export default { ArgsDetachDidDocumentVersionMetadata };
