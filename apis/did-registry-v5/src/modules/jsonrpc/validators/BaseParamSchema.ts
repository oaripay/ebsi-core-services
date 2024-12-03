import { isAddress } from "@ethersproject/address";
import { z } from "zod";

export const baseParamSchema = z.object({
  from: z.string().refine(isAddress, { message: "Invalid Ethereum address" }),
});

export default baseParamSchema;
