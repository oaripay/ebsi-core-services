import { Bytes } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";

import {
  handleMetadataUpdated,
  handleSchemaInserted,
  handleSchemaUpdated,
} from "../src/trusted-schemas-registry";
import {
  createMetadataUpdatedvent,
  createSchemaInsertedEvent,
  createSchemaUpdatedEvent,
} from "./trusted-schemas-registry-utils";

describe("Trusted Schemas Registry - entity assertions", () => {
  const schemaId = "0xfa01";
  const revisionId1 = "0xba32";
  const metadataId1 = "0xef11";
  const schema1 = `{"$schema":"https://json-schema.org/d...`;
  const metadata1 = "{}";

  const revisionId2 = "0xefa0";
  const metadataId2 = "0x0145";
  const metadataId3 = "0xace3";
  const schema2 = `{"$schema":"https://json-schema.org/draft...`;
  const metadata2 = "{...}";
  const metadata3 = "{......}";

  beforeAll(() => {
    const event = createSchemaInsertedEvent(
      Bytes.fromHexString(schemaId),
      Bytes.fromHexString(revisionId1),
      Bytes.fromHexString(metadataId1),
      Bytes.fromUTF8(schema1),
      Bytes.fromUTF8(metadata1),
    );
    handleSchemaInserted(event);
  });

  afterAll(() => {
    clearStore();
  });

  test("Insert schema", () => {
    assert.entityCount("Schema", 1);
    assert.entityCount("Revision", 1);
    assert.entityCount("Metadata", 1);
    assert.fieldEquals("Schema", schemaId, "revisions", `[${revisionId1}]`);
    assert.fieldEquals("Schema", schemaId, "lastRevision", revisionId1);
    assert.fieldEquals("Revision", revisionId1, "content", schema1);
    assert.fieldEquals("Revision", revisionId1, "metadata", `[${metadataId1}]`);
    assert.fieldEquals("Metadata", metadataId1, "content", metadata1);
  });

  test("Update schema", () => {
    const event = createSchemaUpdatedEvent(
      Bytes.fromHexString(schemaId),
      Bytes.fromHexString(revisionId2),
      Bytes.fromHexString(metadataId2),
      Bytes.fromUTF8(schema2),
      Bytes.fromUTF8(metadata2),
    );
    handleSchemaUpdated(event);

    assert.entityCount("Schema", 1);
    assert.entityCount("Revision", 2);
    assert.entityCount("Metadata", 2);
    assert.fieldEquals(
      "Schema",
      schemaId,
      "revisions",
      `[${revisionId1}, ${revisionId2}]`,
    );
    assert.fieldEquals("Schema", schemaId, "lastRevision", revisionId2);
    assert.fieldEquals("Revision", revisionId2, "content", schema2);
    assert.fieldEquals("Revision", revisionId2, "metadata", `[${metadataId2}]`);
    assert.fieldEquals("Metadata", metadataId2, "content", metadata2);
  });

  test("Update metadata", () => {
    const event = createMetadataUpdatedvent(
      Bytes.fromHexString(revisionId2),
      Bytes.fromHexString(metadataId3),
      Bytes.fromUTF8(metadata3),
    );
    handleMetadataUpdated(event);

    assert.fieldEquals("Revision", revisionId2, "content", schema2);
    assert.fieldEquals(
      "Revision",
      revisionId2,
      "metadata",
      `[${metadataId2}, ${metadataId3}]`,
    );
    assert.fieldEquals("Metadata", metadataId3, "content", metadata3);
  });
});
