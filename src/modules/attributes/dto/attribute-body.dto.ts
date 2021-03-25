import { IsString, IsIn, IsObject, IsMimeType } from "class-validator";
import { IsBase64url, IsDid } from "../../../shared/validators";

export class AttributeBodyDto {
  @IsString()
  storageUri: string;

  @IsDid()
  did: string;

  @IsIn(["private", "shared"])
  visibility: string;

  @IsMimeType()
  contentType: string;

  @IsBase64url()
  data: string;

  @IsString()
  dataLabel: string;

  @IsObject()
  proof: unknown;
}

export default AttributeBodyDto;
