// eslint-disable-next-line max-classes-per-file
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsUrl,
  ValidateNested,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { IsDid } from "@ebsiint-api/shared";

class Proof {
  @IsNotEmpty()
  @IsString()
  @Equals("EcdsaSecp256k1Signature2019")
  type!: string;

  @IsNotEmpty()
  @IsDateString()
  created!: string;

  @IsNotEmpty()
  @IsString()
  @Equals("assertionMethod")
  proofPurpose!: string;

  @IsNotEmpty()
  @IsString()
  verificationMethod!: string;

  @IsNotEmpty()
  @IsString()
  jws!: string;
}

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  schemaId!: string;

  @IsNotEmpty({
    each: true,
  })
  @IsString({
    each: true,
  })
  type!: string[];

  @IsNotEmpty({
    each: true,
  })
  @IsString({
    each: true,
  })
  @IsUrl(
    {},
    {
      each: true,
    },
  )
  "@context": string[];

  @IsNotEmpty()
  @IsDid()
  from!: string;

  @IsNotEmpty()
  @IsDid()
  to!: string;

  @IsNotEmpty()
  @IsDateString()
  issuanceDate!: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsNotEmpty()
  payload!: unknown;

  @IsNotEmpty()
  @ValidateNested({ message: "nested property proof must be an object" })
  @Type(() => Proof)
  proof!: Proof;
}

export default CreateNotificationDto;
