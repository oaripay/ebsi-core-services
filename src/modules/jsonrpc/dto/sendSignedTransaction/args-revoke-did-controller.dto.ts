import { IsEthereumAddress, Validate } from "class-validator";
import { IsHexadecimalDidRule } from "../../validators";

export class ArgsRevokeDidController {
  // Consumer calling function must convert Base58 DID identifier into bytes in hex format
  @Validate(IsHexadecimalDidRule)
  identifier: string;

  // ETH address of the new DID Controller on the SC
  @IsEthereumAddress()
  oldControllerId: string;
}

export default { ArgsRevokeDidController };
