import { z } from "zod";
import {
  BigNumber,
  isBigNumberish,
  type BigNumberish,
  // eslint-disable-next-line import/extensions
} from "@ethersproject/bignumber/lib/bignumber.js";
import { jsonRpcSchema } from "./JsonRpcSchema.js";
import { baseParamSchema } from "./BaseParamSchema.js";
import { refinements } from "./utils.js";
import { hexToDid } from "../../../shared/utils.js";
import { AccountType } from "../../../shared/constants.js";

const { isHexadecimal, isSender } = refinements;

export const grantAccessSchema = baseParamSchema
  .merge(
    z.object({
      documentHash: z.string().superRefine(isHexadecimal),
      grantedByAccount: z.string().superRefine(isSender),
      subjectAccount: z.string().superRefine(isSender),
      grantedByAccType: z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine(
          (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
          {
            message: "Number must be 0 (did:ebsi) or 1 (did:key)",
          },
        ),
      subjectAccType: z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine(
          (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
          {
            message: "Number must be 0 (did:ebsi) or 1 (did:key)",
          },
        ),
      permission: z
        .custom<BigNumberish>((val) => isBigNumberish(val))
        .refine(
          (val) => BigNumber.from(val).gte(0) && BigNumber.from(val).lte(1),
          {
            message: "Number must be 0 (delegate) or 1 (write)",
          },
        ),
    }),
  )
  .superRefine(
    (
      { grantedByAccount, grantedByAccType, subjectAccount, subjectAccType },
      ctx,
    ) => {
      const grantedByAccountDid = hexToDid(grantedByAccount);
      if (
        (grantedByAccType === AccountType.DID_EBSI &&
          !grantedByAccountDid.startsWith("did:ebsi:")) ||
        (grantedByAccType === AccountType.DID_KEY &&
          !grantedByAccountDid.startsWith("did:key:"))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "grantedByAccount and grantedByAccType don't match",
        });
      }

      const subjectAccountDid = hexToDid(subjectAccount);
      if (
        (subjectAccType === AccountType.DID_EBSI &&
          !subjectAccountDid.startsWith("did:ebsi:")) ||
        (subjectAccType === AccountType.DID_KEY &&
          !subjectAccountDid.startsWith("did:key:"))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "subjectAccount and subjectAccType don't match",
        });
      }
    },
  );

export type GrantAccessSchema = z.infer<typeof grantAccessSchema>;

export const requestGrantAccessDtoSchema = jsonRpcSchema.merge(
  z.object({
    method: z.literal("grantAccess"),
    params: z.array(grantAccessSchema).min(1).max(1),
  }),
);
