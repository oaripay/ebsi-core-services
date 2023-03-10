import { z } from "zod";

export const attributesSchema = z.object({
  self: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      href: z.string(),
    })
  ),
  total: z.number(),
  pageSize: z.number(),
  links: z.object({
    first: z.string(),
    prev: z.string(),
    next: z.string(),
    last: z.string(),
  }),
});

export const revisionsSchema = z.object({
  self: z.string(),
  items: z.array(
    z.object({
      hash: z.string(),
      body: z.string(),
      issuerType: z.string(),
      tao: z.string(),
      rootTao: z.string(),
    })
  ),
  total: z.number(),
  pageSize: z.number(),
  links: z.object({
    first: z.string(),
    prev: z.string(),
    next: z.string(),
    last: z.string(),
  }),
});
