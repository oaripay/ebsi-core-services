import { Transform } from "class-transformer";
import {
  Equals,
  IsString,
  IsJWT,
  IsDefined,
  IsObject,
  IsNotEmptyObject,
} from "class-validator";
import type { JsonObject } from "type-fest";
import { Scope } from "../authorisation.interfaces";
import { IsScope } from "../validators";

export class CreateAccessTokenDto {
  @IsString()
  @Equals("vp_token")
  readonly "grant_type": string;

  @IsDefined()
  @Transform(({ value }) => {
    if (value && typeof value === "string") {
      return value.split(" ");
    }
    return [];
  })
  @IsScope()
  readonly "scope": [Scope, Scope];

  @IsJWT()
  readonly "vp_token": string;

  @IsObject()
  @IsNotEmptyObject()
  readonly "presentation_submission": JsonObject;
}

export default CreateAccessTokenDto;
