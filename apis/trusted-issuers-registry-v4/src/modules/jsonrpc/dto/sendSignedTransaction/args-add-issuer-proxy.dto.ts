import { Validate } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";
import { IsIssuerProxy } from "../../../../shared/validators/IsIssuerProxy";

export class ArgsAddIssuerProxy {
  @IsDidV1()
  did!: string;

  @Validate(IsIssuerProxy)
  proxyData!: string;
}

export default ArgsAddIssuerProxy;
