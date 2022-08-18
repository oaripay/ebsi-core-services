import { IsString, IsByteLength } from "class-validator";

export class PutKeyValueParams {
  @IsString()
  @IsByteLength(1, 256)
  key: string;
}

export default PutKeyValueParams;
