import { base58btc } from "multiformats/bases/base58";

export function isDid(value: string): boolean {
  if (typeof value !== "string") return false;

  const parts = value.split(":");

  if (parts.length < 3 || parts[0] !== "did") return false;

  // EBSI DID Validation
  const methodPrefix = "did:ebsi:";
  const version = 0x01;
  const byteLength = 16;

  // Don't check method specific identifier if it's not an EBSI DID
  if (!value.startsWith(methodPrefix)) return true;

  const methodSpecificIdentifier = value.substr(methodPrefix.length);

  try {
    const decodedIdentifier = base58btc.decode(methodSpecificIdentifier);

    return (
      // The first byte must be the version identifier
      decodedIdentifier[0] === version &&
      // The length must be 17 bytes (1+ 16)
      decodedIdentifier.length === 1 + byteLength
    );
  } catch (e) {
    // Unable to decode multibase base58 string
    return false;
  }
}

export default isDid;
