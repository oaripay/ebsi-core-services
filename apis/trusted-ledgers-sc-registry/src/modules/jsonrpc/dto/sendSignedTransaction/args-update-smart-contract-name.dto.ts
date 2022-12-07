import { IsString } from "class-validator";

export class ArgsUpdateSmartContractName {
  @IsString()
  oldName: string;

  @IsString()
  newName: string;
}

export default { ArgsUpdateSmartContractName };
