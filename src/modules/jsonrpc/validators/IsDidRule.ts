import { Injectable } from "@nestjs/common";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import DidMethodsService from "../../did-methods/did-methods.service";
import { isDid } from "../../../shared/validators";

export const IS_DID_RULE = "isDidRule";
@ValidatorConstraint({ name: IS_DID_RULE, async: true })
@Injectable()
export class IsDidRule implements ValidatorConstraintInterface {
  constructor(private didMethodsService: DidMethodsService) {}

  /**
   * Checks if the string is an hexadecimal DID.
   * If given value is not a string, then it returns false.
   */
  async validate(value: string): Promise<boolean> {
    // It must be a DID, i.e "did:xxx:xxx"
    if (!isDid(value)) return false;
    // Check in DID Registry if the method ("did:xxx") is registered
    try {
      const method = value.split(":");
      const didMethod = await this.didMethodsService.getDidMethod(
        `${method[0]}:${method[1]}`
      );
      if (!didMethod.status || didMethod.status !== 1) return false;
    } catch (error) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must contain a valid DID method`;
  }
}
export default IsDidRule;
