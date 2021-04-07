import { IsDid } from "../../../shared/validators";

export class GetIdentifierParamsDto {
  @IsDid()
  "did": string;
}

export default GetIdentifierParamsDto;
