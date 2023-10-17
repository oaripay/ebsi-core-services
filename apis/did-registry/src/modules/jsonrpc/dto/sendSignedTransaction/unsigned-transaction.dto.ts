import { IsString } from "class-validator";

export class UnsignedTransaction {
  @IsString()
  from!: string;

  @IsString()
  to!: string;

  @IsString()
  data!: string;

  @IsString()
  nonce!: string;

  @IsString()
  chainId!: string;

  @IsString()
  gasLimit!: string;

  @IsString()
  gasPrice!: string;

  @IsString()
  value!: string;
}

export default { UnsignedTransaction };
