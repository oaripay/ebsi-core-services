import { z } from "zod";

export const issuerSchema = z.object({
  attributes: z.array(
    z.object({
      body: z.string(),
      hash: z.string(),
      issuerType: z.string(),
      rootTao: z.string(),
      tao: z.string(),
    }),
  ),
  did: z.string(),
});

export default issuerSchema;
