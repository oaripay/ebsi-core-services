import { IsEthereumAddress } from "class-validator";

export class GetSubjectParams {
  @IsEthereumAddress()
  subject!: string;
}
