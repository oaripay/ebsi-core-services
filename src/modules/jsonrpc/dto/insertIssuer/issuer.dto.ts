import { IsObject } from "class-validator";
import IsDid from "../../types/IsDid";

export default class Issuer {
  @IsDid()
  did: string;

  @IsObject()
  attributeData: unknown;
}
