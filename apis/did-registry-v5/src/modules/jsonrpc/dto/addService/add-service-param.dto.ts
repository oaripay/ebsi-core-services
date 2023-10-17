import { IsEthereumAddress } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";
import { IsServiceDocument } from "./IsServiceDocument.js";

export class AddServiceParam {
  @IsEthereumAddress()
  from!: string;

  @IsDidV1()
  did!: string;

  @IsServiceDocument()
  service!: string;
}

export default { AddServiceParam };
