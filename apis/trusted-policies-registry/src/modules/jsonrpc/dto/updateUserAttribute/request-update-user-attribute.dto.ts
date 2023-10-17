import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateUserAttributeParam } from "./update-user-attribute-param.dto.js";

export class RequestUpdateUserAttributeDto extends JsonRpcDto {
  @Equals("updateUserAttribute")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateUserAttributeParam)
  declare params: UpdateUserAttributeParam[];
}

export default RequestUpdateUserAttributeDto;
