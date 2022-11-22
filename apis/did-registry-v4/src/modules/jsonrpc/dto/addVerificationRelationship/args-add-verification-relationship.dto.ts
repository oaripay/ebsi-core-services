import { IsString, IsInt, Min, IsIn } from "class-validator";

import { IsDidV1 } from "../../../../shared/validators";

export class ArgsAddVerificationRelationship {
  @IsDidV1()
  did: string;

  @IsIn([
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ])
  name: string;

  @IsString()
  vMethodId: string;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsAddVerificationRelationship };
