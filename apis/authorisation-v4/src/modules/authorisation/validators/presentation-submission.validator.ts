import { z } from "zod";

const basePexDescriptorSchema = z.object({
  id: z.string(),
  path: z.string(),
  format: z.string(),
});

type Descriptor = z.infer<typeof basePexDescriptorSchema> & {
  path_nested?: Descriptor;
};

const pexDescriptorSchema: z.ZodType<Descriptor> =
  basePexDescriptorSchema.extend({
    path_nested: z.optional(z.lazy(() => pexDescriptorSchema)),
  });

export const presentationSubmissionSchema = z.object({
  id: z.string(),
  definition_id: z.string(),
  descriptor_map: z.array(pexDescriptorSchema),
});

export default presentationSubmissionSchema;
