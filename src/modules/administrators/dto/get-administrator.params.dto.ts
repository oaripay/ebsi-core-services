import { IsDid } from "../../../shared/validators";

export class GetAdministratorParamsDto {
  @IsDid()
  "did": string;
}

export default GetAdministratorParamsDto;
