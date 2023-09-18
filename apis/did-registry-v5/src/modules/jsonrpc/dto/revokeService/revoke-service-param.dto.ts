import { IsEthereumAddress, IsString } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class RevokeServiceParam {
  @IsEthereumAddress()
  from!: string;

  @IsString()
  serviceId!: string;

  @IsDidV1()
  did!: string;
}

export default { RevokeServiceParam };
