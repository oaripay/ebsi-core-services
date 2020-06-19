import { IsString, IsDefined, IsNumber, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class DocumentDto {
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
