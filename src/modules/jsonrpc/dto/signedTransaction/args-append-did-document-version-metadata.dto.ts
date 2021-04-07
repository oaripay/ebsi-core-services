import { IsHexadecimalDid, IsHexadecimalJsonLd } from "../../validators";

export class ArgsAppendDidDocumentVersionMetadata {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDid()
  identifier: string;

  // Stringified JSON-LD DID Document (hex-encoded)
  @IsHexadecimalJsonLd()
  didVersionInfo: string;

  // Stringified JSON-LD DID Document metadata (hex-encoded)
  @IsHexadecimalJsonLd()
  didVersionMetadata: string;
}

export default { ArgsAppendDidDocumentVersionMetadata };
