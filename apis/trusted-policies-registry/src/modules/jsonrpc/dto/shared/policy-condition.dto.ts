import { IsHexadecimal, IsNumber, IsString, Max, Min } from "class-validator";
import {
  ATTRIBUTE_TYPES,
  ATTRIBUTE_OPERATIONS,
} from "../../../policies/policies.interface.js";

export class PolicyConditionDto {
  @IsString()
  name!: string;

  @IsString()
  attributeName!: string;

  @IsNumber()
  @Min(0)
  @Max(ATTRIBUTE_TYPES.length - 1, {
    message: `typeOfValue must be less or equal to ${
      ATTRIBUTE_TYPES.length - 1
    }`,
  })
  typeOfValue!: number;

  @IsHexadecimal()
  value!: string;

  @IsNumber()
  @Min(0)
  @Max(ATTRIBUTE_OPERATIONS.length - 1)
  attributeOperation!: number;
}

export default PolicyConditionDto;
