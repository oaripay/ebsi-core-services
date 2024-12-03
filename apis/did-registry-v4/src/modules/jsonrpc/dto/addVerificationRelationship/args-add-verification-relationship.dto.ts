import { IsDidV1 } from "@ebsiint-api/shared";
import { IsIn, IsInt, IsString, Min } from "class-validator";

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
