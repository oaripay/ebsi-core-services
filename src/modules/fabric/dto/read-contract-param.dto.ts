import { IsArray, IsString } from "class-validator";

export class ReadContractParam {
  @IsString()
  channelName: string;

  @IsString()
  contractName: string;

  @IsString()
  fcn: string;

  @IsArray()
  args: string[];
}

export default { ReadContractParam };
