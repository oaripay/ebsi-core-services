import { log } from "matchstick-as";

import { Metadata, Revision, Schema } from "../generated/schema";
import {
  MetadataUpdated,
  SchemaInserted,
  SchemaUpdated,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";

export function handleMetadataUpdatedEvent(event: MetadataUpdated): void {
  const revision = Revision.load(event.params.schemaRevisionId);

  if (!revision) {
    log.error("Revision {} not found", [
      event.params.schemaRevisionId.toHexString(),
    ]);
    return;
  }

  const metadata = new Metadata(event.params.metadataId);
  metadata.content = event.params.metadata.toString();
  metadata.revision = revision.id;
  metadata.save();
}

export function handleSchemaInsertedEvent(event: SchemaInserted): void {
  const schema = new Schema(event.params.schemaId);
  schema.save();

  const revision = new Revision(event.params.schemaRevisionId);
  revision.content = event.params.schema.toString();
  revision.schema = schema.id;
  revision.save();

  const metadata = new Metadata(event.params.metadataId);
  metadata.content = event.params.metadata.toString();
  metadata.revision = revision.id;
  metadata.save();
}

export function handleSchemaUpdatedEvent(event: SchemaUpdated): void {
  const schema = Schema.load(event.params.schemaId);

  if (!schema) {
    log.error("Schema {} not found", [event.params.schemaId.toHexString()]);
    return;
  }

  const revision = new Revision(event.params.schemaRevisionId);
  revision.content = event.params.schema.toString();
  revision.schema = schema.id;
  revision.save();

  const metadata = new Metadata(event.params.metadataId);
  metadata.content = event.params.metadata.toString();
  metadata.revision = revision.id;
  metadata.save();
}
