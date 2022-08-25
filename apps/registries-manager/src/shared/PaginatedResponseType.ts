import BigNumber from "bn.js";

export type PaginatedResponseType = {
  howMany: BigNumber;
  items: string[];
  total: BigNumber;
};
