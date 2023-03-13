import { IsIn, IsOptional, IsString } from "class-validator";
import { IsDidV1, PaginationQuery } from "@ebsiint-api/shared";

const verificationRelationships = [
  "authentication",
  "assertionMethod",
  "keyAgreement",
  "capabilityInvocation",
  "capabilityDelegation",
] as const;

export class GetIdentifiersDto extends PaginationQuery {
  @IsOptional()
  @IsDidV1()
  "controller"?: string;

  @IsOptional()
  @IsString()
  "verification-method-id"?: string;

  @IsOptional()
  @IsIn(verificationRelationships)
  "verification-relationship"?: (typeof verificationRelationships)[number];
}

export default GetIdentifiersDto;
