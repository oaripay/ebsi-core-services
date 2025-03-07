import { IsEthereumAddress } from "class-validator";

import { ArgsAddVerificationRelationship } from "./args-add-verification-relationship.dto.ts";

export class AddVerificationRelationshipParam extends ArgsAddVerificationRelationship {
  @IsEthereumAddress()
  from!: string;
}

export default { AddVerificationRelationshipParam };
