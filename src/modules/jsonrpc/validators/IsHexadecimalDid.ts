import { Injectable } from "@nestjs/common";
import {
  isHexadecimal,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import DidMethodsService from "../../did-methods/did-methods.service";
import { isDid } from "../../../shared/validators";

export const IS_HEXADECIMAL_DID = "isHexadecimalDid";

@ValidatorConstraint({ name: IS_HEXADECIMAL_DID, async: true })
@Injectable()
export class IsHexadecimalDidRule implements ValidatorConstraintInterface {
  constructor(private didMethodsService: DidMethodsService) {}

  /**
   * Checks if the string is an hexadecimal DID.
   * If given value is not a string, then it returns false.
   */
  async validate(value: unknown): Promise<boolean> {
    if (typeof value !== "string" || !isHexadecimal(value)) return false;

    // Must start with 0x
    if (!value.startsWith("0x")) return false;

    // Length must be even
    if (value.length % 2 !== 0) return false;

    const utf8Value = Buffer.from(value.substr(2), "hex").toString("utf8");

    // It must be a DID, i.e "did:xxx:xxx"
    if (!isDid(utf8Value)) return false;

    // Check in DID Registry if the method ("did:xxx") is registered
    try {
      const method = utf8Value.split(":");
      const didMethod = await this.didMethodsService.getDidMethod(
        `${method[0]}:${method[1]}`
      );
      if (!didMethod.status || didMethod.status !== 1) return false;
    } catch (error) {
      return false;
    }

    // Note: we simplify the validation rule because not all the DID we support must start with did:ebsi,
    // nor must they contain 32 bytes encoded in base58
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid DID encoded in hexadecimal`;
  }
}

export default IsHexadecimalDidRule;
