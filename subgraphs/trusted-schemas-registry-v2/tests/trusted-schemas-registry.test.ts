import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  newMockCall,
  test,
} from "matchstick-as/assembly/index";

import { Schema } from "../generated/schema";
import {
  InsertSchemaCall,
  UpdateMetadataCall,
  UpdateSchemaCall,
} from "../generated/TrustedSchemasRegistry/TrustedSchemasRegistry";
import {
  handleInsertSchemaCall,
  handleUpdateMetadataCall,
  handleUpdateSchemaCall,
} from "../src/mappings";

describe("Trusted Schemas Registry - entity assertions", () => {
  const schemaId = "0xfa01";
  const revisionId1 = "0xba32";
  const schema1 = `{"$schema":"https://json-schema.org/d...`;
  const metadata1 = "{}";
  const revisionId2 = "0xefa0";
  const schema2 = `{"$schema":"https://json-schema.org/draft...`;
  const metadata2 = "{...}";
  const metadata3 = "{......}";

  beforeAll(() => {
    const call = changetype<InsertSchemaCall>(newMockCall());

    call.inputValues = [
      new ethereum.EventParam(
        "schemaId",
        ethereum.Value.fromBytes(Bytes.fromHexString(schemaId)),
      ),
      new ethereum.EventParam(
        "schema",
        ethereum.Value.fromBytes(Bytes.fromUTF8(schema1)),
      ),
      new ethereum.EventParam(
        "metadata",
        ethereum.Value.fromBytes(Bytes.fromUTF8(metadata1)),
      ),
    ];

    call.outputValues = [
      new ethereum.EventParam(
        "schemaRevisionId",
        ethereum.Value.fromBytes(Bytes.fromHexString(revisionId1)),
      ),
    ];

    handleInsertSchemaCall(call);
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
    assert.bytesEquals(Bytes.fromHexString(revisionId1), revisions[0].id);
    assert.stringEquals(schema1, revisions[0].content);

    // Check revision metadata
    const metadata = revisions[0].metadata.load();
    assert.i32Equals(1, metadata.length, "The revision should have 1 metadata");
    assert.stringEquals(metadata1, metadata[0].content);
  });

  test("Update schema", () => {
    const call = changetype<UpdateSchemaCall>(newMockCall());

    call.inputValues = [
      new ethereum.EventParam(
        "schemaId",
        ethereum.Value.fromBytes(Bytes.fromHexString(schemaId)),
      ),
      new ethereum.EventParam(
        "schema",
        ethereum.Value.fromBytes(Bytes.fromUTF8(schema2)),
      ),
      new ethereum.EventParam(
        "metadata",
        ethereum.Value.fromBytes(Bytes.fromUTF8(metadata2)),
      ),
    ];

    call.outputValues = [
      new ethereum.EventParam(
        "schemaRevisionId",
        ethereum.Value.fromBytes(Bytes.fromHexString(revisionId2)),
      ),
    ];

    handleUpdateSchemaCall(call);

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

    // Check revision #1
    assert.bytesEquals(Bytes.fromHexString(revisionId1), revisions[0].id);
    assert.stringEquals(schema1, revisions[0].content);
    const revision1Metadata = revisions[0].metadata.load();
    assert.i32Equals(
      1,
      revision1Metadata.length,
      "The revision should have 1 metadata",
    );
    assert.stringEquals(metadata1, revision1Metadata[0].content);

    // Check revision #2
    assert.bytesEquals(Bytes.fromHexString(revisionId2), revisions[1].id);
    assert.stringEquals(schema2, revisions[1].content);
    const revision2Metadata = revisions[1].metadata.load();
    assert.i32Equals(
      1,
      revision2Metadata.length,
      "The revision should have 1 metadata",
    );
    assert.stringEquals(metadata2, revision2Metadata[0].content);
  });

  test("Update metadata", () => {
    const call = changetype<UpdateMetadataCall>(newMockCall());

    call.inputValues = [
      new ethereum.EventParam(
        "schemaRevisionId",
        ethereum.Value.fromBytes(Bytes.fromHexString(revisionId2)),
      ),
      new ethereum.EventParam(
        "metadata",
        ethereum.Value.fromBytes(Bytes.fromUTF8(metadata3)),
      ),
    ];

    handleUpdateMetadataCall(call);

    const schema = Schema.load(Bytes.fromHexString(schemaId));

    if (!schema) {
      throw new Error("Schema not found");
    }

    // Check schema revisions
    const revisions = schema.revisions.load();
    assert.i32Equals(2, revisions.length, "The schema should have 2 revisions");

    // Check revision #1
    assert.bytesEquals(Bytes.fromHexString(revisionId1), revisions[0].id);
    assert.stringEquals(schema1, revisions[0].content);
    const revision1Metadata = revisions[0].metadata.load();
    assert.i32Equals(
      1,
      revision1Metadata.length,
      "The revision should have 1 metadata",
    );
    assert.stringEquals(metadata1, revision1Metadata[0].content);

    // Check revision #2
    assert.bytesEquals(Bytes.fromHexString(revisionId2), revisions[1].id);
    assert.stringEquals(schema2, revisions[1].content);
    const revision2Metadata = revisions[1].metadata.load();
    assert.i32Equals(
      2,
      revision2Metadata.length,
      "The revision should have 2 metadata",
    );
    assert.stringEquals(metadata2, revision2Metadata[0].content);
    assert.stringEquals(metadata3, revision2Metadata[1].content);
  });
});
