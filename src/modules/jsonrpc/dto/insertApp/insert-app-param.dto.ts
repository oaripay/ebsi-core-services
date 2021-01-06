import { IsEthereumAddress, IsString, IsEnum, IsInt } from "class-validator";
import { Status, Domain } from "../shared/enums";

export class InsertAppParam {
  @IsEthereumAddress()
  from: string;

  @IsString()
  name: string;

  @IsEnum(Domain)
  domain: Domain;

  @IsString()
  appAdministrator: string;

  @IsString()
  publicKey: string;

  @IsEnum(Status)
  status: Status;

  @IsInt()
  notBefore: number;

  @IsInt()
  notAfter: number;
}

export default { InsertAppParam };
