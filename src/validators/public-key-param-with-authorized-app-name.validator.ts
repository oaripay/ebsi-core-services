import { IsDefined, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

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

export default PublicKeyParamWithAuthorizedAppName;
