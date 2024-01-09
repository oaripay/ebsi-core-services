import { z } from "zod";
import { isAddress } from "@ethersproject/address";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const deleteUserAttributeSchema = baseParamSchema.merge(
  z.object({
    user: z.string().refine(isAddress, { message: "Invalid Ethereum address" }),
    attribute: z.string(),
  }),
);

export type DeleteUserAttributeSchema = z.infer<
  typeof deleteUserAttributeSchema
>;

export const requestDeleteUserAttributeDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("deleteUserAttribute"),
    params: z.array(deleteUserAttributeSchema).min(1).max(1),
  }),
);
