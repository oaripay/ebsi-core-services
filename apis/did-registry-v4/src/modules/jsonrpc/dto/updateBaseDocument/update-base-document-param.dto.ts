import { IsEthereumAddress } from "class-validator";

import { ArgsUpdateBaseDocument } from "./args-update-base-document.dto.js";

export class UpdateBaseDocumentParam extends ArgsUpdateBaseDocument {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateBaseDocumentParam };
