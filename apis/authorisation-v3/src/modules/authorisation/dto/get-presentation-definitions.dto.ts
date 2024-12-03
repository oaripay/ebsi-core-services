import type { Scope } from "../authorisation.interfaces.js";

import { IsScope } from "../validators/index.js";

export class GetPresentationDefinitionsDto {
  @IsScope()
  readonly "scope": Scope;
}

export default GetPresentationDefinitionsDto;
