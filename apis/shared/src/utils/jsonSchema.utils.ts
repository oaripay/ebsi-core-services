import crypto from "node:crypto";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import type { JSONSchema } from "@apidevtools/json-schema-ref-parser/dist/lib/types";
import canonicalize from "canonicalize";
import cloneDeep from "lodash.clonedeep";

export function removeAnnotations(obj: JSONSchema): JSONSchema {
  /**
   * Lists of annotations keywords:
   * - https://json-schema.org/draft/2020-12/json-schema-validation.html#rfc.section.9
   * - https://json-schema.org/draft/2019-09/json-schema-validation.html#rfc.section.9
   * - https://json-schema.org/draft-07/json-schema-validation.html#rfc.section.10
   */
  const keysToRemove = [
    "title",
    "description",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
    "examples",
  ];

  return JSON.parse(
    JSON.stringify(obj, (key, val: unknown) =>
      keysToRemove.includes(key) ? undefined : val,
    ),
  ) as JSONSchema;
}

export async function computeId(schema: JSONSchema): Promise<Buffer> {
  // 1. Bundle schema
  // Warning $RefParser.bundle mutates the object we pass to it, that's why we pass a clone
  const bundledSchema = await $RefParser.bundle(cloneDeep(schema));

  // 2. Remove annotations
  const sanitizedDocument = removeAnnotations(bundledSchema);

  // 3. Canonicalise
  // @ts-expect-error "canonicalize is not callable" <- the exported types are incorrect
  const canonicalizedDocument = (canonicalize(sanitizedDocument) as ReturnType<
    typeof canonicalize.default
  >)!;

  // 4. Compute sha256 of the stringified JSON document
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalizedDocument), "utf-8")
    .digest();

  return hash;
}
