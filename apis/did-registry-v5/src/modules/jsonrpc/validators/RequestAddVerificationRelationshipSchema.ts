import { isDidV1 } from "@ebsiint-api/shared";
import { z } from "zod";
import { BigNumber } from "ethers";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";

const verificationRelationships = [
  "authentication",
  "assertionMethod",
  "keyAgreement",
  "capabilityInvocation",
  "capabilityDelegation",
] as const;

export const addVerificationRelationshipSchema = baseParamSchema.merge(
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
    name: z.enum(verificationRelationships),
    vMethodId: z.string(),
    notBefore: z.preprocess(
      (val) => (BigNumber.isBigNumber(val) ? val.toNumber() : val),
      z.number().int().min(0),
    ),
    notAfter: z.preprocess(
      (val) => (BigNumber.isBigNumber(val) ? val.toNumber() : val),
      z.number().int().min(0),
    ),
  }),
);

export type AddVerificationRelationshipSchema = z.infer<
  typeof addVerificationRelationshipSchema
>;

export const requestAddVerificationRelationshipDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("addVerificationRelationship"),
    params: z.array(addVerificationRelationshipSchema).min(1).max(1),
  }),
);
