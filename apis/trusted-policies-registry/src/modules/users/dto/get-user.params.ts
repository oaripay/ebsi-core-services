import { IsEthereumAddress } from "class-validator";

export class GetUserParams {
  @IsEthereumAddress()
  address: string;
}

export default GetUserParams;
