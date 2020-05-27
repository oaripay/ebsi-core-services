import { IsDefined, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PublicKeyParam {
  @ApiProperty({
    description: `Existing values: ebsi-storage, ebsi-wallet, ...`,
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  public appName: string;
}

export default PublicKeyParam;
