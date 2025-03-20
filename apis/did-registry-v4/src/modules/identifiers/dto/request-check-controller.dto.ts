import { IsEthereumAddress } from "@ebsiint-api/shared";
import { ArrayMaxSize, ArrayMinSize, Equals, IsArray } from "class-validator";

import { JsonRpcDto } from "../../jsonrpc/dto/index.ts";

export class RequestCheckControllerDto extends JsonRpcDto {
  @Equals("checkController")
  declare method: "checkController";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsEthereumAddress({ each: true })
  declare params: string[];
}
