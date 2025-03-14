import { IsDidV1 } from "@ebsiint-api/shared";
import { Validate } from "class-validator";

import { IsIssuerProxy } from "../../../../shared/validators/IsIssuerProxy.ts";

export class ArgsAddIssuerProxy {
  @IsDidV1()
  did!: string;

  @Validate(IsIssuerProxy)
  proxyData!: string;
}
