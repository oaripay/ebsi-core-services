import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  newMockEvent,
  test,
} from "matchstick-as/assembly/index";

import { Revision, Schema } from "../generated/schema";
import {
  MetadataUpdated,
  SchemaInserted,
  SchemaUpdated,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";
import {
  handleMetadataUpdatedEvent,
  handleSchemaInsertedEvent,
  handleSchemaUpdatedEvent,
} from "../src/mappings";
import { assertArrayContainsAllValues } from "./utils";

function paramBytes(name: string, value: Bytes): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBytes(value));
}

describe("Trusted Schemas Registry - entity assertions", () => {
  const schemaId = "0xfa01";
  const revision1Id = "0xba32";
  const schema1 = `{"$schema":"https://json-schema.org/d...`;
  const metadata1 = "{}";
  const metadata1Id = "0x12ef";
  const revision2Id = "0xefa0";
  const schema2 = `{"$schema":"https://json-schema.org/draft...`;
  const metadata2 = "{...}";
  const metadata2Id = "0x5ca1";
  const metadata3 = "{......}";
  const metadata3Id = "0x3d08";

  beforeAll(() => {
    const event = changetype<SchemaInserted>(newMockEvent());

    event.parameters = [
      paramBytes("schemaId", Bytes.fromHexString(schemaId)),
      paramBytes("schema", Bytes.fromUTF8(schema1)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision1Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadata1)),
      paramBytes("metadataId", Bytes.fromHexString(metadata1Id)),
    ];

    handleSchemaInsertedEvent(event);
  });

  afterAll(() => {
    clearStore();
  });

  test("Insert schema", () => {
    assert.entityCount("Schema", 1);
    assert.entityCount("Revision", 1);
    assert.entityCount("Metadata", 1);

    const schema = Schema.load(Bytes.fromHexString(schemaId));

    if (!schema) {
      throw new Error("Schema not found");
    }

    // Check schema revisions
    const revisions = schema.revisions.load();
    assert.i32Equals(1, revisions.length, "The schema should have 1 revision");
    assert.bytesEquals(Bytes.fromHexString(revision1Id), revisions[0].id);
    assert.stringEquals(schema1, revisions[0].content);

    // Check revision metadata
    const metadata = revisions[0].metadata.load();
    assert.i32Equals(1, metadata.length, "The revision should have 1 metadata");
    assert.stringEquals(metadata1, metadata[0].content);
  });

  test("Update schema", () => {
    const event = changetype<SchemaUpdated>(newMockEvent());

    event.parameters = [
      paramBytes("schemaId", Bytes.fromHexString(schemaId)),
      paramBytes("schema", Bytes.fromUTF8(schema2)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision2Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadata2)),
      paramBytes("metadataId", Bytes.fromHexString(metadata2Id)),
    ];

    handleSchemaUpdatedEvent(event);

    assert.entityCount("Schema", 1);
    assert.entityCount("Revision", 2);
    assert.entityCount("Metadata", 2);

    const schema = Schema.load(Bytes.fromHexString(schemaId));

    if (!schema) {
      throw new Error("Schema not found");
    }

    // Check schema revisions
    const revisions = schema.revisions.load();
    assert.i32Equals(2, revisions.length, "The schema should have 2 revisions");

    // We can't trust the order of the revisions, hence we can simply check that they're all included
    const actualRevisionIds = revisions.map<string>((revision) =>
      revision.id.toHexString(),
    );
    assertArrayContainsAllValues(
      actualRevisionIds,
      [revision1Id, revision2Id],
      "Schema should contain the revisions [revision1Id, revision2Id]",
    );

    // Check revision #1
    const revision1 = Revision.load(Bytes.fromHexString(revision1Id));
    if (!revision1) throw new Error("Revision not found");
    assert.stringEquals(schema1, revision1.content);
    const revision1Metadata = revision1.metadata.load();
    assert.i32Equals(
      1,
      revision1Metadata.length,
      "The revision should have 1 metadata",
    );
    assert.stringEquals(metadata1, revision1Metadata[0].content);

    // Check revision #2
    const revision2 = Revision.load(Bytes.fromHexString(revision2Id));
    if (!revision2) throw new Error("Revision not found");
    assert.stringEquals(schema2, revision2.content);
    const revision2Metadata = revision2.metadata.load();
    assert.i32Equals(
      1,
      revision2Metadata.length,
      "The revision should have 1 metadata",
    );
    assert.stringEquals(metadata2, revision2Metadata[0].content);
  });

  test("Update metadata", () => {
    const event = changetype<MetadataUpdated>(newMockEvent());

    event.parameters = [
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision2Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadata3)),
      paramBytes("metadataId", Bytes.fromHexString(metadata3Id)),
    ];

    handleMetadataUpdatedEvent(event);

    const schema = Schema.load(Bytes.fromHexString(schemaId));

    if (!schema) {
      throw new Error("Schema not found");
    }

    // Check schema revisions
    const revisions = schema.revisions.load();
    assert.i32Equals(2, revisions.length, "The schema should have 2 revisions");

    // Check revision #1
    const revision1 = Revision.load(Bytes.fromHexString(revision1Id));
    if (!revision1) throw new Error("Revision not found");
    assert.stringEquals(schema1, revision1.content);
    const revision1Metadata = revision1.metadata.load();
    assert.i32Equals(
      1,
      revision1Metadata.length,
      "The revision should have 1 metadata",
    );
    assert.stringEquals(metadata1, revision1Metadata[0].content);

    // Check revision #2
    const revision2 = Revision.load(Bytes.fromHexString(revision2Id));
    if (!revision2) throw new Error("Revision not found");
    assert.stringEquals(schema2, revision2.content);
    const revision2Metadata = revision2.metadata.load();
    assert.i32Equals(
      2,
      revision2Metadata.length,
      "The revision should have 2 metadata",
    );

    // We can't trust the order of the metadata
    const actualMetadataContents = revision2Metadata.map<string>(
      (metadata) => metadata.content,
    );
    assertArrayContainsAllValues(
      actualMetadataContents,
      [metadata2, metadata3],
      "Revision #2 should contain the metadata [metadata2, metadata3]",
    );
  });
});
