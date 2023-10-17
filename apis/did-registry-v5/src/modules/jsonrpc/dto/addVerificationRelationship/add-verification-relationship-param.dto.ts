import { IsEthereumAddress } from "class-validator";
import { ArgsAddVerificationRelationship } from "./args-add-verification-relationship.dto.js";

export class AddVerificationRelationshipParam extends ArgsAddVerificationRelationship {
  @IsEthereumAddress()
  from!: string;
}

export default { AddVerificationRelationshipParam };
