import { IsHexadecimal, IsNumber, Matches, Min } from "class-validator";
import {
  IsHexadecimalDidRule,
  IsHexadecimalJsonLdDidDocument,
} from "../../validators/index.js";

export class ArgsDetachDidDocumentVersionHash {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDidRule()
  identifier!: string;

  // The hash algorithm id used to compute the hashValue.
  @IsNumber()
  @Min(0)
  hashAlgorithmId!: number;

  // Hash value of the canonicalized (https://tools.ietf.org/html/rfc8785) JSON DID document, computed by the user calling the function.
  @IsHexadecimal()
  @Matches(/^0x/)
  hashValue!: string;

  // Stringified JSON DID document(hex-encoded)
  @IsHexadecimalJsonLdDidDocument()
  @Matches(/^0x/)
  didVersionInfo!: string;
}

export default { ArgsDetachDidDocumentVersionHash };
