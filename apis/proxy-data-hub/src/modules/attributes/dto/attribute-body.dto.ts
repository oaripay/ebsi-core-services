import {
  IsString,
  IsIn,
  IsObject,
  Equals,
  IsMimeType,
  IsOptional,
} from "class-validator";
import { IsBase64url, IsDid } from "@ebsiint-api/shared";
import type { Visibility } from "../attributes.interface.js";
import { loadConfig } from "../../../config/configuration.js";

const { storageApiUrl } = loadConfig();
export class AttributeBodyDto {
  @Equals(`${storageApiUrl}/stores/distributed`)
  storageUri!: string;

  @IsDid()
  did!: string;

  @IsOptional()
  @IsIn(["private", "shared"])
  visibility?: Visibility;

  @IsOptional()
  @IsDid()
  sharedWith?: string;

  @IsMimeType()
  contentType!: string;

  @IsBase64url()
  data!: string;

  @IsOptional()
  @IsString()
  dataLabel?: string;

  @IsOptional()
  @IsObject()
  proof?: unknown;
}

export default AttributeBodyDto;
