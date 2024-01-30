import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const authoriseDidSchema = baseParamSchema.merge(
  z.object({
    didEbsi: z.string().superRefine((val, ctx) => {
      const didValidation = isDidV1(val);
      if (!didValidation.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: didValidation.error,
        });
      }
    }),
    whiteList: z.boolean(),
  }),
);

export type AuthoriseDidSchema = z.infer<typeof authoriseDidSchema>;

export const requestAuthoriseDidDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("authoriseDid"),
    params: z.array(authoriseDidSchema).min(1).max(1),
  }),
);
