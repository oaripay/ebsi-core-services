import { Metadata, Revision, Schema } from "../generated/schema";
import {
  MetadataUpdated,
  SchemaInserted,
  SchemaUpdated,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";

export function handleMetadataUpdated(event: MetadataUpdated): void {
  const revision = Revision.load(event.params.schemaRevisionId);
  if (!revision) return;
  const metadata = new Metadata(event.params.metadataId);

  const revisionMetadata = revision.metadata;
  revisionMetadata.push(metadata.id);
  revision.metadata = revisionMetadata;
  revision.save();

  metadata.content = event.params.metadata.toString();
  metadata.save();
}

export function handleSchemaInserted(event: SchemaInserted): void {
  const schema = new Schema(event.params.schemaId);
  const revision = new Revision(event.params.schemaRevisionId);
  const metadata = new Metadata(event.params.metadataId);

  schema.revisions = [revision.id];
  schema.lastRevision = revision.id;
  schema.save();

  revision.content = event.params.schema.toString();
  revision.metadata = [metadata.id];
  revision.save();

  metadata.content = event.params.metadata.toString();
  metadata.save();
}

export function handleSchemaUpdated(event: SchemaUpdated): void {
  const schema = Schema.load(event.params.schemaId);
  if (!schema) return;
  const revision = new Revision(event.params.schemaRevisionId);
  const metadata = new Metadata(event.params.metadataId);

  const schemaRevisions = schema.revisions;
  schemaRevisions.push(revision.id);
  schema.revisions = schemaRevisions;
  schema.lastRevision = revision.id;
  schema.save();

  revision.content = event.params.schema.toString();
  revision.metadata = [metadata.id];
  revision.save();

  metadata.content = event.params.metadata.toString();
  metadata.save();
}
