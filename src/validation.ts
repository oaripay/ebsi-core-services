import { IsString, IsDefined, IsNumber, Max, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DIDParams {
  @IsString()
  @IsDefined()
  @ApiProperty()
  did: string;
}

// tslint:disable-next-line:max-classes-per-file
export class ChallengeParams {
  @IsString()
  @IsDefined()
  @ApiProperty()
  did: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ enum: ["universities", "governments"] })
  type: string;
}
// tslint:disable-next-line:max-classes-per-file
export class Authorize {
  @IsString()
  @IsDefined()
  @ApiProperty()
  cryptedMessage: string;

  @IsString()
  @IsDefined()
  @ApiProperty()
  signature: string;
}

// tslint:disable-next-line:max-classes-per-file
export class UniversityBody {
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

// tslint:disable-next-line:max-classes-per-file
export class GovernmentBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  issuerDID: string;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;

  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  country: string;
}

// tslint:disable-next-line:max-classes-per-file
export class Document {
  @ApiProperty()
  @IsString()
  @IsDefined()
  vcCode: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  title: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  revision: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  status: string;

  @ApiProperty()
  @IsNumber()
  @IsDefined()
  @Max(2)
  type: string;

  @ApiProperty()
  @IsNumber()
  @IsDefined()
  dateStart: string;
}

// tslint:disable-next-line:max-classes-per-file
export class Accreditation {
  @ApiProperty()
  @IsString()
  @IsDefined()
  targetFramework: string;

  @ApiProperty()
  @IsUrl()
  @IsDefined()
  targetResource: string;
}
