import {
  IsHexadecimal,
  IsNumber,
  IsOptional,
  Matches,
  Min,
  Validate,
} from "class-validator";
import { IsHexadecimalDidRule, IsHexadecimalJson } from "../../validators";

export class ArgsInsertDidDocument {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @Validate(IsHexadecimalDidRule)
  identifier: string;

  // The hash algorithm id used to compute the hashValue.
  // TODO: dynamically check that hashAlgorithmId is valid?
  @IsNumber()
  @Min(0)
  hashAlgorithmId: number;

  // Hash value of the canonicalized (https://tools.ietf.org/html/rfc8785) JSON DID Document, computed by the user calling the function.
  // TODO: dynamically check that hashValue is valid? Get hash_alg corresponding to hashAlgorithmId
  // and check if hash_alg(canonicalize(didVersionInfo)) == hashValue
  @IsHexadecimal()
  @Matches(/^0x/)
  hashValue: string;

  // Stringified JSON DID Document (hex-encoded)
  @IsHexadecimalJson()
  @Matches(/^0x/)
  didVersionInfo: string;

  // Stringified JSON (hex-encoded)
  @IsOptional()
  @IsHexadecimalJson()
  @Matches(/^0x/)
  timestampData?: string;

  // Stringified JSON metadata (hex-encoded)
  @IsOptional()
  @IsHexadecimalJson()
  @Matches(/^0x/)
  didVersionMetadata?: string;
}

export default { ArgsInsertDidDocument };
