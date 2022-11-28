import { IsIn, IsOptional, IsString } from "class-validator";
import { IsDidV1, PaginationQuery } from "@ebsiint-api/shared";

export class GetIdentifiersDto extends PaginationQuery {
  @IsOptional()
  @IsDidV1()
  "controller": string;

  @IsOptional()
  @IsString()
  "verification-method-id": string;

  @IsOptional()
  @IsIn([
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ])
  "verification-relationship": string;
}

export default GetIdentifiersDto;
