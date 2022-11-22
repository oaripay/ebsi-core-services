import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  IsEthereumAddress,
} from "class-validator";
import { JsonRpcDto } from "../../jsonrpc/dto";

export class RequestCheckControllerDto extends JsonRpcDto {
  @Equals("checkController")
  method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @IsEthereumAddress({ each: true })
  params: string[];
}

export default RequestCheckControllerDto;
