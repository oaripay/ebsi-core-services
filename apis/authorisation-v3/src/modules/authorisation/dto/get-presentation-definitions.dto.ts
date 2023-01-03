import { IsIn, IsOptional } from "class-validator";
import { SUPPORTED_SCOPES } from "../authorisation.constants";
import { Scope } from "../authorisation.interfaces";

export class GetPresentationDefinitionsDto {
  @IsOptional()
  @IsIn(SUPPORTED_SCOPES)
  readonly "scope": Scope = "openid";
}

export default GetPresentationDefinitionsDto;
