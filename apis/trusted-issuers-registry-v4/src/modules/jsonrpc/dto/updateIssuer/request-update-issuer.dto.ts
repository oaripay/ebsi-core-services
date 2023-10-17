import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateIssuerParam } from "./update-issuer-param.dto.js";

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
