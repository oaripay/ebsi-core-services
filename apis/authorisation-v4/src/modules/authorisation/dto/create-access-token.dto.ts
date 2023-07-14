import { Equals, IsString, IsJWT, IsJSON } from "class-validator";
import { Scope } from "../authorisation.interfaces";
import { IsScope } from "../validators";

export class CreateAccessTokenDto {
  @IsString()
  @Equals("vp_token")
  readonly "grant_type": string;

  @IsScope()
  readonly "scope": Scope;

  @IsJWT()
  readonly "vp_token": string;

  @IsJSON()
  readonly "presentation_submission": string;
}

export default CreateAccessTokenDto;
