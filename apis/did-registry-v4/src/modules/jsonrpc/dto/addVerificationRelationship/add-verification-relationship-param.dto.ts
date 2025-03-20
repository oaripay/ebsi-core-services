import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsAddVerificationRelationship } from "./args-add-verification-relationship.dto.ts";

export class AddVerificationRelationshipParam extends ArgsAddVerificationRelationship {
  @IsEthereumAddress()
  from!: string;
}
