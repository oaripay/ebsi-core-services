import { z } from "zod";

export const issuerSchema = z.object({
  did: z.string(),
  attributes: z.array(
    z.object({
      hash: z.string(),
      body: z.string(),
      issuerType: z.string(),
      tao: z.string(),
      rootTao: z.string(),
    }),
  ),
});

export default issuerSchema;
