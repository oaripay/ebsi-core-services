import { IsDidV1 } from "../../../../shared/validators";

export class ArgsAddController {
  @IsDidV1()
  did: string;

  @IsDidV1()
  controller: string;
}

export default { ArgsAddController };
