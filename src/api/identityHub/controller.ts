import {
  ICredentialInfoList,
  Filters,
  ICredentialOut,
  IAttributeInput,
} from "src/dtos/attributeInfo";
import { EBSI_API_ERRORS } from "src/error";
import { IDHub } from "src/libs/identityHub/IDHub";
import { ICallResponse } from "src/dtos/messages";

export default class Controller {
  static async getAttributes(did: string): Promise<ICredentialInfoList> {
    if (!did) throw Error(EBSI_API_ERRORS.BAD_REQUEST);
    return IDHub.Instance.getAttributes(did);
  }

  static async getAttributesFiltered(
    did: string,
    filters: Filters
  ): Promise<ICredentialInfoList> {
    if (!did || !filters || !filters.types)
      throw Error(EBSI_API_ERRORS.BAD_REQUEST);
    return IDHub.Instance.getAttributesFiltered(did, filters.types);
  }

  static async getAttribute(
    did: string,
    hash: string
  ): Promise<ICredentialOut> {
    if (!did || !hash) throw Error(EBSI_API_ERRORS.BAD_REQUEST);
    return IDHub.Instance.getAttribute(did, hash);
  }

  static async setAttribute(
    did: string,
    iAttributeInput: IAttributeInput
  ): Promise<ICallResponse> {
    if (!did || !iAttributeInput) throw Error(EBSI_API_ERRORS.BAD_REQUEST);
    this.checkParamsSetAttribute(iAttributeInput);
    return IDHub.Instance.setAttribute(did, iAttributeInput);
  }

  private static checkParamsSetAttribute(input: IAttributeInput): void {
    if (!input.id || !input.data || !input.data.base64)
      throw Error(EBSI_API_ERRORS.BAD_REQUEST);
  }
}
