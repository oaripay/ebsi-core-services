import { IsString, IsByteLength } from "class-validator";

export class GetKeyValueParams {
  @IsString()
  @IsByteLength(1, 256)
  key!: string;
}

export default GetKeyValueParams;
