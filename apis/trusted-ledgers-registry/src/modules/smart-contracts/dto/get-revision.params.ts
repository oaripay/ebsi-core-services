import { IsHexadecimal } from "class-validator";
import { GetSmartContractParams } from "./get-smart-contract.params";

export class GetRevisionParams extends GetSmartContractParams {
  @IsHexadecimal()
  revisionHash: string;
}

export default GetRevisionParams;
