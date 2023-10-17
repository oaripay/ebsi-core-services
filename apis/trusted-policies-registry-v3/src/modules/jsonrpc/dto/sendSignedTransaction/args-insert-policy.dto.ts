import { IsString } from "class-validator";

export class ArgsInsertPolicy {
  @IsString()
  policyName!: string;

  @IsString()
  description!: string;
}

export default { ArgsInsertPolicy };
