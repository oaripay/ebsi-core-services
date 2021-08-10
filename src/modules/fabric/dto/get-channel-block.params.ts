import { IsNumberString } from "class-validator";
import { GetChannelParams } from "./get-channel.params";

export class GetChannelBlockParams extends GetChannelParams {
  @IsNumberString()
  blockNumber: string;
}

export default GetChannelBlockParams;
