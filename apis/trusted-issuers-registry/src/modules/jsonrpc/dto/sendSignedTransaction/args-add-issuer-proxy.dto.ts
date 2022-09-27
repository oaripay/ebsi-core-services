import { Validate } from "class-validator";
import { IsDidV1, IsIssuerProxy } from "../../../../shared/validators";

export class ArgsAddIssuerProxy {
  @IsDidV1()
  did: string;

  @Validate(IsIssuerProxy)
  proxyData: string;
}

export default ArgsAddIssuerProxy;
