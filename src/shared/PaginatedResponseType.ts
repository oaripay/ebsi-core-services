import { BigNumber } from "ethers";

export type PaginatedResponseType = {
  howMany: BigNumber;
  items: string[];
};
