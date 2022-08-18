import { IsHexadecimal } from "class-validator";

export class GetSmartContractParams {
  @IsHexadecimal()
  smartContractInfoId: string;
}

export default GetSmartContractParams;
