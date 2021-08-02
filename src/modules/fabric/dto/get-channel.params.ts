import { Matches } from "class-validator";

export class GetChannelParams {
  @Matches(/^[a-z][a-z0-9.-]*$/)
  channelName: string;
}

export default GetChannelParams;
