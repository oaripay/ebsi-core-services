import { IsEthereumAddress } from "class-validator";

export class GetUserParams {
  @IsEthereumAddress()
  user!: string;
}
