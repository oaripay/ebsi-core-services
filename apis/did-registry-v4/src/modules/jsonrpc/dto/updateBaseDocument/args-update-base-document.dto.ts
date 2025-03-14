import { IsBaseDocument, IsDidV1 } from "@ebsiint-api/shared";

export class ArgsUpdateBaseDocument {
  @IsDidV1()
  did!: string;

  @IsBaseDocument()
  baseDocument!: string;
}
