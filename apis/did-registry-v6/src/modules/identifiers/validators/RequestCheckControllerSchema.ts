import { isAddress } from "@ethersproject/address";
import { z } from "zod";

import { jsonRpcSchema } from "./JsonRpcSchema.js";

export const checkControllerSchema = z
  .string()
  .refine(isAddress, { message: "Invalid Ethereum address" });

export type CheckControllerSchema = z.infer<typeof checkControllerSchema>;

export const requestCheckControllerDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("checkController"),
    params: z.array(checkControllerSchema).min(1).max(1),
  }),
);
