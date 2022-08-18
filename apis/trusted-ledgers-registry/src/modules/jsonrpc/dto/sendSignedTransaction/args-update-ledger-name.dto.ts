import { IsString } from "class-validator";

export class ArgsUpdateLedgerName {
  @IsString()
  oldName: string;

  @IsString()
  newName: string;
}

export default { ArgsUpdateLedgerName };
