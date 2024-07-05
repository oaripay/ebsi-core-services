import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import { Resolver } from "did-resolver";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

export const authoriseDidSchemaBuilder = (didResolver: Resolver) =>
  baseParamSchema.merge(
    z.object({
      senderDid: z.string().superRefine((val, ctx) => {
        const didValidation = isDidV1(val);
        if (!didValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: didValidation.error,
          });
        }
      }),
      authorisedDid: z.string().superRefine(async (val, ctx) => {
        const didValidation = isDidV1(val);

        if (!didValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: didValidation.error,
          });
          return;
        }

        const doc = await didResolver.resolve(val);

        if (!doc.didDocument) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "message" in doc.didResolutionMetadata &&
              typeof doc.didResolutionMetadata["message"] === "string"
                ? doc.didResolutionMetadata["message"]
                : `DID document ${val} not found`,
          });
        }
      }),
      whiteList: z.boolean(),
    }),
  );

export type AuthoriseDidSchema = z.infer<
  ReturnType<typeof authoriseDidSchemaBuilder>
>;

export const requestAuthoriseDidDtoSchemaBuilder = (didResolver: Resolver) =>
  jsonRpcSchema.merge(
    z.object({
      method: z.literal("authoriseDid"),
      params: z.array(authoriseDidSchemaBuilder(didResolver)).min(1).max(1),
    }),
  );
