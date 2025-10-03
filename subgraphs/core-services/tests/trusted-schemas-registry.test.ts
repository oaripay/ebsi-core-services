import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  newMockEvent,
  test,
} from "matchstick-as";

import { Schema, SchemaRevision } from "../generated/schema";
import {
  MetadataUpdated,
  SchemaInserted,
  SchemaUpdated,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";
import {
  handleMetadataUpdatedEvent,
  handleSchemaInsertedEvent,
  handleSchemaUpdatedEvent,
} from "../src/trusted-schemas-registry-v3/mappings";
import { assertArrayContainsAllValues } from "./trusted-schemas-registry.utils";

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
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaId)),
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
    assert.entityCount("SchemaRevision", 1);
    assert.entityCount("SchemaMetadata", 1);

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
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaId)),
      paramBytes("schemaId", Bytes.fromHexString(schemaId)),
      paramBytes("schema", Bytes.fromUTF8(schema2)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision2Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadata2)),
      paramBytes("metadataId", Bytes.fromHexString(metadata2Id)),
    ];

    handleSchemaUpdatedEvent(event);

    assert.entityCount("Schema", 1);
    assert.entityCount("SchemaRevision", 2);
    assert.entityCount("SchemaMetadata", 2);

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
    const revision1 = SchemaRevision.load(Bytes.fromHexString(revision1Id));
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
    const revision2 = SchemaRevision.load(Bytes.fromHexString(revision2Id));
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
    const revision1 = SchemaRevision.load(Bytes.fromHexString(revision1Id));
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
    const revision2 = SchemaRevision.load(Bytes.fromHexString(revision2Id));
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

  test("Schema insertion with name and version parsing", () => {
    // Test that handleSchemaInsertedEvent properly parses name and version from metadata
    const schemaIdNew = "0xfa05";
    const revisionNewId = "0xba37";
    const schemaNew = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}`;
    const metadataWithNameVersion =
      '{"name":"New Test Schema","version":"1.0.0","description":"A new test schema"}';
    const metadataNewId = "0x12f4";

    // Insert a new schema
    const insertEvent = changetype<SchemaInserted>(newMockEvent());
    insertEvent.parameters = [
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaIdNew)),
      paramBytes("schemaId", Bytes.fromHexString(schemaIdNew)),
      paramBytes("schema", Bytes.fromUTF8(schemaNew)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revisionNewId)),
      paramBytes("metadata", Bytes.fromUTF8(metadataWithNameVersion)),
      paramBytes("metadataId", Bytes.fromHexString(metadataNewId)),
    ];
    handleSchemaInsertedEvent(insertEvent);

    // Load the revision and verify name and version were set
    const revision = SchemaRevision.load(Bytes.fromHexString(revisionNewId));
    if (!revision) {
      throw new Error("Schema revision not found");
    }

    assert.stringEquals(
      "New Test Schema",
      revision.name!,
      "Schema revision name should be set from metadata during insertion",
    );
    assert.stringEquals(
      "1.0.0",
      revision.version!,
      "Schema revision version should be set from metadata during insertion",
    );
  });

  test("Update metadata with name and version parsing", () => {
    // First, create a schema with a revision that has metadata containing name and version
    const schemaId2 = "0xfa02";
    const revision3Id = "0xba33";
    const schema3 = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}`;
    const metadataWithNameVersion =
      '{"name":"Test Schema","version":"1.0.0","description":"A test schema"}';
    const metadata3Id = "0x12f0";

    // Insert a new schema
    const insertEvent = changetype<SchemaInserted>(newMockEvent());
    insertEvent.parameters = [
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaId2)),
      paramBytes("schemaId", Bytes.fromHexString(schemaId2)),
      paramBytes("schema", Bytes.fromUTF8(schema3)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision3Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadataWithNameVersion)),
      paramBytes("metadataId", Bytes.fromHexString(metadata3Id)),
    ];
    handleSchemaInsertedEvent(insertEvent);

    // Load the revision and verify it has name/version from initial metadata
    let revision = SchemaRevision.load(Bytes.fromHexString(revision3Id));
    if (!revision) {
      throw new Error("Schema revision not found");
    }

    // Initially, name and version should be set from the metadata since handleSchemaInsertedEvent now parses them
    assert.stringEquals(
      "Test Schema",
      revision.name!,
      "Schema revision name should be set from initial metadata",
    );
    assert.stringEquals(
      "1.0.0",
      revision.version!,
      "Schema revision version should be set from initial metadata",
    );

    // Now update the metadata with new content that has name and version
    const metadataUpdateId = "0x3d09";
    const updatedMetadata =
      '{"name":"Updated Test Schema","version":"2.0.0","description":"An updated test schema"}';

    const updateEvent = changetype<MetadataUpdated>(newMockEvent());
    updateEvent.parameters = [
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision3Id)),
      paramBytes("metadata", Bytes.fromUTF8(updatedMetadata)),
      paramBytes("metadataId", Bytes.fromHexString(metadataUpdateId)),
    ];

    handleMetadataUpdatedEvent(updateEvent);

    // Reload the revision and verify name and version were updated
    revision = SchemaRevision.load(Bytes.fromHexString(revision3Id));
    if (!revision) {
      throw new Error("Schema revision not found after metadata update");
    }

    assert.stringEquals(
      "Updated Test Schema",
      revision.name!,
      "Schema revision name should be updated",
    );
    assert.stringEquals(
      "2.0.0",
      revision.version!,
      "Schema revision version should be updated",
    );
  });

  test("Metadata update on different revisions should update respective revision name/version", () => {
    // Create a schema with multiple revisions
    const schemaId4 = "0xfa04";
    const revision5Id = "0xba35";
    const revision6Id = "0xba36";
    const schema5 = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}`;
    const schema6 = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":false}`;
    const metadata5 = '{"name":"Schema v1","version":"1.0.0"}';
    const metadata6 = '{"name":"Schema v2","version":"2.0.0"}';
    const metadata5Id = "0x12f2";
    const metadata6Id = "0x12f3";

    // Insert initial schema
    const insertEvent = changetype<SchemaInserted>(newMockEvent());
    insertEvent.parameters = [
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaId4)),
      paramBytes("schemaId", Bytes.fromHexString(schemaId4)),
      paramBytes("schema", Bytes.fromUTF8(schema5)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision5Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadata5)),
      paramBytes("metadataId", Bytes.fromHexString(metadata5Id)),
    ];
    handleSchemaInsertedEvent(insertEvent);

    // Update schema to create a second revision (latest)
    const updateEvent = changetype<SchemaUpdated>(newMockEvent());
    updateEvent.parameters = [
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaId4)),
      paramBytes("schemaId", Bytes.fromHexString(schemaId4)),
      paramBytes("schema", Bytes.fromUTF8(schema6)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision6Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadata6)),
      paramBytes("metadataId", Bytes.fromHexString(metadata6Id)),
    ];
    handleSchemaUpdatedEvent(updateEvent);

    // Update metadata on the first revision
    const metadataUpdateId = "0x3d0b";
    const updatedMetadata =
      '{"name":"Updated Old Schema","version":"1.5.0","description":"This should update the first revision"}';

    const metadataUpdateEvent = changetype<MetadataUpdated>(newMockEvent());
    metadataUpdateEvent.parameters = [
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision5Id)), // First revision
      paramBytes("metadata", Bytes.fromUTF8(updatedMetadata)),
      paramBytes("metadataId", Bytes.fromHexString(metadataUpdateId)),
    ];

    handleMetadataUpdatedEvent(metadataUpdateEvent);

    // Verify that the first revision name/version were updated
    const revision5 = SchemaRevision.load(Bytes.fromHexString(revision5Id));
    if (!revision5) {
      throw new Error("First revision not found");
    }

    assert.stringEquals(
      "Updated Old Schema",
      revision5.name!,
      "First revision name should be updated",
    );
    assert.stringEquals(
      "1.5.0",
      revision5.version!,
      "First revision version should be updated",
    );

    // Verify that the second revision name/version were not affected
    const revision6 = SchemaRevision.load(Bytes.fromHexString(revision6Id));
    if (!revision6) {
      throw new Error("Second revision not found");
    }

    assert.stringEquals(
      "Schema v2",
      revision6.name!,
      "Second revision name should remain unchanged",
    );
    assert.stringEquals(
      "2.0.0",
      revision6.version!,
      "Second revision version should remain unchanged",
    );

    // Now update metadata on the latest revision
    const latestMetadataUpdateId = "0x3d0c";
    const latestUpdatedMetadata =
      '{"name":"Latest Schema Update","version":"3.0.0","description":"This should update the latest revision"}';

    const latestMetadataUpdateEvent =
      changetype<MetadataUpdated>(newMockEvent());
    latestMetadataUpdateEvent.parameters = [
      paramBytes("schemaRevisionId", Bytes.fromHexString(revision6Id)), // Latest revision
      paramBytes("metadata", Bytes.fromUTF8(latestUpdatedMetadata)),
      paramBytes("metadataId", Bytes.fromHexString(latestMetadataUpdateId)),
    ];

    handleMetadataUpdatedEvent(latestMetadataUpdateEvent);

    // Reload and verify the latest revision was updated
    const updatedRevision6 = SchemaRevision.load(
      Bytes.fromHexString(revision6Id),
    );
    if (!updatedRevision6) {
      throw new Error("Latest revision not found after metadata update");
    }

    assert.stringEquals(
      "Latest Schema Update",
      updatedRevision6.name!,
      "Latest revision name should be updated",
    );
    assert.stringEquals(
      "3.0.0",
      updatedRevision6.version!,
      "Latest revision version should be updated",
    );
  });

  test("Schema update with name and version parsing", () => {
    // Test that handleSchemaUpdatedEvent properly parses name and version from metadata
    const schemaIdUpdate = "0xfa06";
    const revisionUpdate1Id = "0xba38";
    const revisionUpdate2Id = "0xba39";
    const schemaUpdate1 = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}`;
    const schemaUpdate2 = `{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":false}`;
    const metadataUpdate1 = '{"name":"Update Schema v1","version":"1.0.0"}';
    const metadataUpdate2 = '{"name":"Update Schema v2","version":"2.0.0"}';
    const metadataUpdate1Id = "0x12f5";
    const metadataUpdate2Id = "0x12f6";

    // Insert initial schema
    const insertEvent = changetype<SchemaInserted>(newMockEvent());
    insertEvent.parameters = [
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaIdUpdate)),
      paramBytes("schemaId", Bytes.fromHexString(schemaIdUpdate)),
      paramBytes("schema", Bytes.fromUTF8(schemaUpdate1)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revisionUpdate1Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadataUpdate1)),
      paramBytes("metadataId", Bytes.fromHexString(metadataUpdate1Id)),
    ];
    handleSchemaInsertedEvent(insertEvent);

    // Update schema
    const updateEvent = changetype<SchemaUpdated>(newMockEvent());
    updateEvent.parameters = [
      paramBytes("schemaIdHash", Bytes.fromHexString(schemaIdUpdate)),
      paramBytes("schemaId", Bytes.fromHexString(schemaIdUpdate)),
      paramBytes("schema", Bytes.fromUTF8(schemaUpdate2)),
      paramBytes("schemaRevisionId", Bytes.fromHexString(revisionUpdate2Id)),
      paramBytes("metadata", Bytes.fromUTF8(metadataUpdate2)),
      paramBytes("metadataId", Bytes.fromHexString(metadataUpdate2Id)),
    ];
    handleSchemaUpdatedEvent(updateEvent);

    // Load the first revision and verify name and version
    const revision1 = SchemaRevision.load(
      Bytes.fromHexString(revisionUpdate1Id),
    );
    if (!revision1) {
      throw new Error("First revision not found");
    }

    assert.stringEquals(
      "Update Schema v1",
      revision1.name!,
      "First revision name should be set from initial metadata",
    );
    assert.stringEquals(
      "1.0.0",
      revision1.version!,
      "First revision version should be set from initial metadata",
    );

    // Load the second revision and verify name and version were updated
    const revision2 = SchemaRevision.load(
      Bytes.fromHexString(revisionUpdate2Id),
    );
    if (!revision2) {
      throw new Error("Second revision not found");
    }

    assert.stringEquals(
      "Update Schema v2",
      revision2.name!,
      "Second revision name should be updated from latest metadata during schema update",
    );
    assert.stringEquals(
      "2.0.0",
      revision2.version!,
      "Second revision version should be updated from latest metadata during schema update",
    );
  });
});
