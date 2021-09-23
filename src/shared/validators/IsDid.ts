import {
  registerDecorator,
  buildMessage,
  ValidationOptions,
} from "class-validator";
import { base58btc } from "multiformats/bases/base58";

export function IsDid(validationOptions?: ValidationOptions) {
  return (object: unknown, propertyName: string): void => {
    registerDecorator({
      name: "isDid",
      target: object.constructor,
      propertyName,
      validator: {
        validate(value: string) {
          if (
            !(
              typeof value === "string" &&
              value.split(":").length >= 3 &&
              value.substring(0, 4) === "did:"
            )
          ) {
            return false;
          }

          // EBSI DID Validation
          const methodPrefix = "did:ebsi:";
          const version = 0x01;
          const byteLength = 16;

          // Don't check method specific identifier if it's not an EBSI DID
          if (!value.startsWith(methodPrefix)) return true;

          const methodSpecificIdentifier = value.substr(methodPrefix.length);

          try {
            const decodedIdentifier = base58btc.decode(
              methodSpecificIdentifier
            );

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
        },
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a valid DID string`,
          validationOptions
        ),
      },
    });
  };
}

export default IsDid;
