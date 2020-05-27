import { IsString, IsDefined } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import Authorize from "./Authorize";

export default class UniversityBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  issuerDID: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  preferredName: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  alternativeName: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  homepage: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  escoOrganizationType: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  siteLocation: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  id: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  legalIdentifier: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  vatIdentifier: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  taxIdentifier: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  identifier: string;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;
}
