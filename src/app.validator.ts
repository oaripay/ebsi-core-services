import {
  IsBoolean,
  IsDefined, IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import * as apps from './apps.json';

export class PublicKeyParam {
  @ApiProperty({
    description: `Existing values: ebsi-storage, ebsi-wallet, ...`,
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public appName: string;
}

// tslint:disable-next-line:max-classes-per-file
export class PublicKeyParamWithAuthorizedAppName {
  @ApiProperty({
    description: `Existing values: ebsi-storage, ebsi-wallet, ...`,
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public appName: string;
  @ApiProperty({
    description: `Existing values: ebsi-storage, ebsi-wallet, ...`,
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public authorizedAppName: string;
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
export class AuthAppBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public name: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public pubKey: string;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;
}


// tslint:disable-next-line:max-classes-per-file
export class AuthorizationBody {
  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public appName: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public authName: string;

  @ApiProperty()
  @IsBoolean()
  @IsDefined()
  @IsNotEmpty()
  public status: boolean;

  @ApiProperty()
  @IsDefined()
  authorize: Authorize;
}

// tslint:disable-next-line:max-classes-per-file
export class ChallengeParams {
  @IsString()
  @IsDefined()
  @ApiProperty()
  name: string;
}
