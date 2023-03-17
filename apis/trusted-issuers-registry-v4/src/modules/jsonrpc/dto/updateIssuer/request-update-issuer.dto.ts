import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateIssuerParam } from "./update-issuer-param.dto";

export class RequestUpdateIssuerDto extends JsonRpcDto {
  @Equals("updateIssuer")
  method!: "updateIssuer";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateIssuerParam)
  params!: UpdateIssuerParam[];
}

export default RequestUpdateIssuerDto;
