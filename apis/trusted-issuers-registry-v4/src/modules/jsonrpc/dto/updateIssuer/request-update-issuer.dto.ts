import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { UpdateIssuerParam } from "./update-issuer-param.dto.ts";

export class RequestUpdateIssuerDto extends JsonRpcDto {
  @Equals("updateIssuer")
  declare method: "updateIssuer";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateIssuerParam)
  declare params: UpdateIssuerParam[];
}

export default RequestUpdateIssuerDto;
