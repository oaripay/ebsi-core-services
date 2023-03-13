import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AddVerificationRelationshipParam } from "./add-verification-relationship-param.dto";

export class RequestAddVerificationRelationshipDto extends JsonRpcDto {
  @Equals("addVerificationRelationship")
  method!: "addVerificationRelationship";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddVerificationRelationshipParam)
  params!: AddVerificationRelationshipParam[];
}

export default RequestAddVerificationRelationshipDto;
