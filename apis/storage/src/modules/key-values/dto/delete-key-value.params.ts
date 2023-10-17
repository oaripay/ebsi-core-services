import { IsString, IsByteLength } from "class-validator";

export class DeleteKeyValueParams {
  @IsString()
  @IsByteLength(1, 256)
  key!: string;
}

export default DeleteKeyValueParams;
