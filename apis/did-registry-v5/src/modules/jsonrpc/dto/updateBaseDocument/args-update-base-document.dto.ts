import { IsDidV1, IsBaseDocument } from "@ebsiint-api/shared";

export class ArgsUpdateBaseDocument {
  @IsDidV1()
  did!: string;

  @IsBaseDocument()
  baseDocument!: string;
}

export default { ArgsUpdateBaseDocument };
