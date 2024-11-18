import { z } from "zod";

/**
 * JSON Web Key
 *
 * @see https://www.rfc-editor.org/rfc/rfc7517#section-4
 */
export const jwkSchema = z
  .object({
    // Only validate that `kty` is present
    kty: z.string(),
    kid: z.optional(z.string()),
    crv: z.optional(z.string()),
  })
  .passthrough(); // Allow extra properties

/**
 * JSON Web Key Set
 * A JWK Set is a JSON object that represents a set of JWKs.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7517#section-5
 */
export const jwksSchema = z.object({
  keys: z.array(jwkSchema).nonempty(),
});

export type JWKS = z.infer<typeof jwksSchema>;
