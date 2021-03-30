import {
  IsString,
  IsIn,
  IsObject,
  Equals,
  IsMimeType,
  IsOptional,
} from "class-validator";
import { IsBase64url, IsDid } from "../../../shared/validators";
import { Visibility } from "../attributes.interface";
import { loadConfig } from "../../../config/configuration";

const { storage } = loadConfig();
export class AttributeBodyDto {
  @Equals(`${storage}/stores/distributed`)
  storageUri: string;

  @IsDid()
  did: string;

  @IsOptional()
  @IsIn(["private", "shared"])
  visibility: Visibility;

  @IsOptional()
  @IsDid()
  sharedWith: string;

  @IsMimeType()
  contentType: string;

  @IsBase64url()
  data: string;

  @IsOptional()
  @IsString()
  dataLabel: string;

  @IsOptional()
  @IsObject()
  proof: unknown;
}

export default AttributeBodyDto;
