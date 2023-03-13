import { IsString, IsInt, Min, IsIn } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

const verificationRelationships = [
  "authentication",
  "assertionMethod",
  "keyAgreement",
  "capabilityInvocation",
  "capabilityDelegation",
] as const;

export class ArgsAddVerificationRelationship {
  @IsDidV1()
  did!: string;

  @IsIn(verificationRelationships)
  name!: (typeof verificationRelationships)[number];

  @IsString()
  vMethodId!: string;

  @IsInt()
  @Min(0)
  notBefore!: number;

  @IsInt()
  @Min(0)
  notAfter!: number;
}

export default { ArgsAddVerificationRelationship };
