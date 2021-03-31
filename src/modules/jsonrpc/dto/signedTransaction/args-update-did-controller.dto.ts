import { IsEthereumAddress, IsNumber, Min } from "class-validator";
import { IsHexadecimalDid } from "../../validators";

export class ArgsUpdateDidController {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @IsHexadecimalDid()
  identifier: string;

  // ETH address of the new DID Controller on the SC
  @IsEthereumAddress()
  newControllerId: string;

  // Unix timestamp
  @IsNumber()
  @Min(0)
  notBefore: number;

  // Unix timestamp
  @IsNumber()
  @Min(0)
  notAfter: number;
}

export default { ArgsUpdateDidController };
