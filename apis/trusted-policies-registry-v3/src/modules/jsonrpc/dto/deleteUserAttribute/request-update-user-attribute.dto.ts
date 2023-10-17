import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DeleteUserAttributeParam } from "./delete-user-attribute-param.dto.js";

export class RequestDeleteUserAttributeDto extends JsonRpcDto {
  @Equals("deleteUserAttribute")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeleteUserAttributeParam)
  declare params: DeleteUserAttributeParam[];
}

export default RequestDeleteUserAttributeDto;
