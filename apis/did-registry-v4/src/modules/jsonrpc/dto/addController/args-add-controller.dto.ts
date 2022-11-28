import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsAddController {
  @IsDidV1()
  did: string;

  @IsDidV1()
  controller: string;
}

export default { ArgsAddController };
