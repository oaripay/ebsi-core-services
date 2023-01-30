import type {
  ConstraintsV2,
  FieldV2,
  FilterV2,
  InputDescriptorV2,
  PresentationDefinitionV2,
} from "@sphereon/pex-models";
import type { JSONSchema7 } from "json-schema";

/**
 * Fix PEX models
 */

// Extend "FilterV2" type with JSONSchema7
export type Filter = FilterV2 & JSONSchema7;

export interface Field extends FieldV2 {
  filter?: Filter;
}

export interface Constraints extends ConstraintsV2 {
  fields?: Array<Field>;
}

export interface InputDescriptor extends InputDescriptorV2 {
  constraints?: Constraints;
}

export interface PresentationDefinition extends PresentationDefinitionV2 {
  input_descriptors: Array<InputDescriptor>;
}
