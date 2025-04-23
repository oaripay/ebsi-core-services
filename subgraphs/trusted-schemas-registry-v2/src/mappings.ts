import { Bytes, crypto } from "@graphprotocol/graph-ts";
import { log } from "matchstick-as";

import { Metadata, Revision, Schema } from "../generated/schema";
import {
  InsertSchemaCall,
  UpdateMetadataCall,
  UpdateSchemaCall,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";

export function handleInsertSchemaCall(call: InsertSchemaCall): void {
  const schema = new Schema(call.inputs.schemaId);
  schema.save();

  const revision = new Revision(call.outputs.schemaRevisionId);
  revision.content = call.inputs.schema.toString();
  revision.schema = schema.id;
  revision.save();

  const metadata = new Metadata(
    Bytes.fromByteArray(crypto.keccak256(call.inputs.metadata)),
  );
  metadata.content = call.inputs.metadata.toString();
  metadata.revision = revision.id;
  metadata.save();
}

export function handleUpdateMetadataCall(call: UpdateMetadataCall): void {
  const revision = Revision.load(call.inputs.schemaRevisionId);

  if (!revision) {
    log.error("Revision {} not found", [
      call.inputs.schemaRevisionId.toHexString(),
    ]);
    return;
  }

  const metadata = new Metadata(
    Bytes.fromByteArray(crypto.keccak256(call.inputs.metadata)),
  );
  metadata.content = call.inputs.metadata.toString();
  metadata.revision = revision.id;
  metadata.save();
}

export function handleUpdateSchemaCall(call: UpdateSchemaCall): void {
  const schema = Schema.load(call.inputs.schemaId);

  if (!schema) {
    log.error("Schema {} not found", [call.inputs.schemaId.toHexString()]);
    return;
  }

  const revision = new Revision(call.outputs.schemaRevisionId);
  revision.content = call.inputs.schema.toString();
  revision.schema = schema.id;
  revision.save();

  const metadata = new Metadata(
    Bytes.fromByteArray(crypto.keccak256(call.inputs.metadata)),
  );
  metadata.content = call.inputs.metadata.toString();
  metadata.revision = revision.id;
  metadata.save();
}
