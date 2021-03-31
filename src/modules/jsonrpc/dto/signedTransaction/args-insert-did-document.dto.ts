import {
  IsHexadecimal,
  IsNumber,
  IsOptional,
  Matches,
  Min,
} from "class-validator";
import {
  IsHexadecimalDid,
  IsHexadecimalJson,
  IsHexadecimalJsonLd,
} from "../../validators";

export class ArgsInsertDidDocument {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDid()
  identifier: string;

  // The hash algorithm id used to compute the hashValue.
  // TODO: dynamically check that hashAlgorithmId is valid?
  @IsNumber()
  @Min(0)
  hashAlgorithmId: number;

  // Hash value of the serialized (with URDNA2015) JSON-LD DID Document, computed by the user calling the function.
  // TODO: dynamically check that hashValue is valid? Get hash_alg corresponding to hashAlgorithmId
  // and check if hash_alg(canonize(didVersionInfo)) == hashValue
  @IsHexadecimal()
  @Matches(/^0x/)
  hashValue: string;

  // Stringified JSON-LD DID Document(hex-encoded)
  @IsHexadecimalJsonLd()
  didVersionInfo: string;

  // Stringified JSON (hex-encoded)
  @IsOptional()
  @IsHexadecimalJson()
  timestampData?: string;

  // Stringified JSON (hex-encoded)
  @IsOptional()
  @IsHexadecimalJson()
  didVersionMetadata?: string;
}

export default { ArgsInsertDidDocument };
