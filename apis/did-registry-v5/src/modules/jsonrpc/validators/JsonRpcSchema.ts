import { z } from "zod";

export const jsonRpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.array(z.unknown()),
  id: z.optional(
    z.union([
      z.string(),
      z.number().int(),
      // Note: Null is discouraged, see https://www.jsonrpc.org/specification#request_object
      z.null(),
    ]),
  ),
});

export type JsonRpcSchema = z.infer<typeof jsonRpcSchema>;

export default jsonRpcSchema;
