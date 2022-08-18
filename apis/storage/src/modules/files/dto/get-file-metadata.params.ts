import { IsString, IsHexadecimal } from "class-validator";

export class GetFileMetadataParams {
  @IsString()
  @IsHexadecimal()
  hash: string;
}

export default GetFileMetadataParams;
