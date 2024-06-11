import { z } from "zod";
import { isAddress } from "@ethersproject/address";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const insertUserAttributesSchema = baseParamSchema.merge(
  z.object({
    user: z.string().refine(isAddress, { message: "Invalid Ethereum address" }),
    attributes: z.array(z.string()),
  }),
);

export type InsertUserAttributesSchema = z.infer<
  typeof insertUserAttributesSchema
>;

export const requestInsertUserAttributesDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("insertUserAttributes"),
    params: z.array(insertUserAttributesSchema).min(1).max(1),
  }),
);
