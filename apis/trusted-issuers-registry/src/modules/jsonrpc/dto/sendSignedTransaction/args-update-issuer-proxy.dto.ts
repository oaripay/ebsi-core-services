import { IsString, Length, Validate } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";
import { IsIssuerProxy } from "../../../../shared/validators/IsIssuerProxy";

export class ArgsUpdateIssuerProxy {
  @IsDidV1()
  did: string;

  @IsString()
  @Length(66) // 2 -> "0x" + 64 -> sha256
  proxyId: string;

  @Validate(IsIssuerProxy)
  proxyData: string;
}

export default ArgsUpdateIssuerProxy;
