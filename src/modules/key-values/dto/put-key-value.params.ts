import { IsString } from "class-validator";

export class PutKeyValueParams {
  @IsString()
  key: string;
}

export default PutKeyValueParams;
