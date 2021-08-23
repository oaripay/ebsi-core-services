import { IsHexadecimal } from "class-validator";
import { GetChannelParams } from "./get-channel.params";

export class GetChannelTransactionParams extends GetChannelParams {
  @IsHexadecimal()
  transactionId: string;
}

export default GetChannelTransactionParams;
