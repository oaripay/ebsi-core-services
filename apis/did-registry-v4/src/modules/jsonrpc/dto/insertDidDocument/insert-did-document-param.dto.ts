import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsInsertDidDocument } from "./args-insert-did-document.dto.ts";

export class InsertDidDocumentParam extends ArgsInsertDidDocument {
  @IsEthereumAddress()
  from!: string;
}
