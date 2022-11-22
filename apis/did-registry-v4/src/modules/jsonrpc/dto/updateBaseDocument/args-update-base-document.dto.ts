import { IsDidV1, IsBaseDocument } from "../../../../shared/validators";

export class ArgsUpdateBaseDocument {
  @IsDidV1()
  did: string;

  @IsBaseDocument()
  baseDocument: string;
}

export default { ArgsUpdateBaseDocument };
