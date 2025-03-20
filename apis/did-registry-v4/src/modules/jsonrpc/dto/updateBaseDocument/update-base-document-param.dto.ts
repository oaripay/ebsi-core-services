import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsUpdateBaseDocument } from "./args-update-base-document.dto.ts";

export class UpdateBaseDocumentParam extends ArgsUpdateBaseDocument {
  @IsEthereumAddress()
  from!: string;
}
