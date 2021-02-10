import { IsString } from "class-validator";

export class GetStoreDto {
  @IsString()
  store: string;
}

export default GetStoreDto;
