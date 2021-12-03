import { IsDid, IsHexadecimalAdminAttribute } from "../../validators";

export class ArgsInsertAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;
}

export default ArgsInsertAdministrator;
