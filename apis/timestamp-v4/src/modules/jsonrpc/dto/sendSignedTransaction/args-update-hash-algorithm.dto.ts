import { IsInt, Min } from "class-validator";
import { ArgsInsertHashAlgorithm } from "./args-insert-hash-algorithm.dto";

export class ArgsUpdateHashAlgorithm extends ArgsInsertHashAlgorithm {
  @IsInt()
  @Min(0)
  hashAlgorithmId!: number;
}

export default { ArgsUpdateHashAlgorithm };
