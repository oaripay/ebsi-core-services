import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";

import {
  MetadataUpdated,
  SchemaInserted,
  SchemaUpdated,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";

export function createMetadataUpdatedvent(
  schemaRevisionId: Bytes,
  metadataId: Bytes,
  metadata: Bytes,
): MetadataUpdated {
  const event = changetype<MetadataUpdated>(newMockEvent());
  event.parameters = [
    paramBytes("schemaRevisionId", schemaRevisionId),
    paramBytes("metadataId", metadataId),
    paramBytes("metadata", metadata),
  ];
  return event;
}

export function createSchemaInsertedEvent(
  schemaId: Bytes,
  schemaRevisionId: Bytes,
  metadataId: Bytes,
  schema: Bytes,
  metadata: Bytes,
): SchemaInserted {
  const event = changetype<SchemaInserted>(newMockEvent());
  event.parameters = [
    paramBytes("schemaId", schemaId),
    paramBytes("schemaRevisionId", schemaRevisionId),
    paramBytes("metadataId", metadataId),
    paramBytes("schema", schema),
    paramBytes("metadata", metadata),
  ];
  return event;
}

export function createSchemaUpdatedEvent(
  schemaId: Bytes,
  schemaRevisionId: Bytes,
  metadataId: Bytes,
  schema: Bytes,
  metadata: Bytes,
): SchemaUpdated {
  const event = changetype<SchemaUpdated>(newMockEvent());
  event.parameters = [
    paramBytes("schemaId", schemaId),
    paramBytes("schemaRevisionId", schemaRevisionId),
    paramBytes("metadataId", metadataId),
    paramBytes("schema", schema),
    paramBytes("metadata", metadata),
  ];
  return event;
}

function paramBytes(name: string, value: Bytes): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBytes(value));
}
