import {
  ICredentialInfoList,
  ICredentialOut,
  IAttributeInput,
} from "../../dtos/attributeInfo";
import { BadRequestError, API_ERROR_MESSAGES } from "../../errors";
import IDHub from "../../libs/identityHub/idHub";

export default class Controller {
  static async getAttributes(did: string): Promise<ICredentialInfoList> {
    return IDHub.Instance.getAttributes(did);
  }

  static async getAttributesFiltered(
    did: string,
    type: string
  ): Promise<ICredentialInfoList> {
    try {
      JSON.parse(type);
    } catch (error) {
      throw new BadRequestError(API_ERROR_MESSAGES.ATTRIBUTE_TYPE_MALFORMED);
    }
    const types = JSON.parse(decodeURIComponent(type));
    return IDHub.Instance.getAttributesFiltered(did, types);
  }

  static async getAttribute(
    did: string,
    hash: string
  ): Promise<ICredentialOut> {
    return IDHub.Instance.getAttribute(did, hash);
  }

  static async setAttribute(
    did: string,
    hash: string,
    iAttributeInput: IAttributeInput
  ): Promise<ICredentialOut> {
    if (
      !iAttributeInput.id ||
      !iAttributeInput.type ||
      !iAttributeInput.name ||
      !iAttributeInput.data ||
      !iAttributeInput.data.base64
    )
      throw new BadRequestError(API_ERROR_MESSAGES.ATTRIBUTE_INPUT_MALFORMED);
    return IDHub.Instance.setAttribute(did, hash, iAttributeInput);
  }
}
