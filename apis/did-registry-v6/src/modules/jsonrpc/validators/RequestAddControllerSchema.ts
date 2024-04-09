import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const addControllerSchema = baseParamSchema.merge(
  z.object({
    did: z.string().superRefine((val, ctx) => {
      const didValidation = isDidV1(val);
      if (!didValidation.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: didValidation.error,
        });
      }
    }),
    controller: z.string().superRefine((val, ctx) => {
      const controllerValidation = isDidV1(val);
      if (!controllerValidation.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: controllerValidation.error,
        });
      }
    }),
  }),
);

export type AddControllerSchema = z.infer<typeof addControllerSchema>;

export const requestAddControllerDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("addController"),
    params: z.array(addControllerSchema).min(1).max(1),
  }),
);
