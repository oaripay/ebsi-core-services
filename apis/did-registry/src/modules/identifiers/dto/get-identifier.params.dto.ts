import { IsDidV1 } from "../../../shared/validators";

export class GetIdentifierParamsDto {
  @IsDidV1()
  "did": string;
}

export default GetIdentifierParamsDto;
