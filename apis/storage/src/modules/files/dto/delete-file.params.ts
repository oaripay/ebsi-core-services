import { IsString, IsHexadecimal } from "class-validator";

export class DeleteFileParams {
  @IsString()
  @IsHexadecimal()
  hash: string;
}

export default DeleteFileParams;
