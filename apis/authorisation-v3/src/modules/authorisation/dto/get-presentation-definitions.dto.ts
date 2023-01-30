import { Transform } from "class-transformer";
import { IsDefined } from "class-validator";
import { Scope } from "../authorisation.interfaces";
import { IsScope } from "../validators";

export class GetPresentationDefinitionsDto {
  @IsDefined()
  @Transform(({ value }) => {
    if (value && typeof value === "string") {
      return value.split(" ");
    }
    return [];
  })
  @IsScope()
  readonly "scope": [Scope, Scope];
}

export default GetPresentationDefinitionsDto;
