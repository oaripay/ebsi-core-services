import { Scope } from "../authorisation.interfaces";
import { IsScope } from "../validators";

export class GetPresentationDefinitionsDto {
  @IsScope()
  readonly "scope": Scope;
}

export default GetPresentationDefinitionsDto;
