import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AddVerificationRelationshipParam } from "./add-verification-relationship-param.dto.js";

export class RequestAddVerificationRelationshipDto extends JsonRpcDto {
  @Equals("addVerificationRelationship")
  declare method: "addVerificationRelationship";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddVerificationRelationshipParam)
  declare params: AddVerificationRelationshipParam[];
}

export default RequestAddVerificationRelationshipDto;
