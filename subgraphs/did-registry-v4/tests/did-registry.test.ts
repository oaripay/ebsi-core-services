import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";

import {
  handleBaseDocumentUpdated,
  handleControllerAdded,
  handleDidDocumentInserted,
  handleVerificationMethodAdded,
  handleVerificationMethodRevoked,
  handleVerificationRelationshipAdded,
  handleVerificationRelationshipUpdated,
} from "../src/did-registry";
import { computeEventId } from "../utils/utils";
import {
  createBaseDocumentUpdatedEvent,
  createControllerAddedEvent,
  createDidDocumentInsertedEvent,
  createVerificationMethodAddedEvent,
  createVerificationMethodRevokedEvent,
  createVerificationRelationshipAddedEvent,
  createVerificationRelationshipUpdatedEvent,
} from "./did-registry-utils";

describe("DID Registry - entity assertions", () => {
  const did = "did:ebsi:zZeKyEJfUTGwajhNyNX928z";

  beforeAll(() => {
    const event = createDidDocumentInsertedEvent(
      did,
      "{}",
      "keys-1",
      Bytes.fromHexString("ff1234567890"),
      true,
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );
    handleDidDocumentInserted(event);
  });

  afterAll(() => {
    clearStore();
  });

  test("Insert did document", () => {
    assert.entityCount("DidDocument", 1);
    assert.fieldEquals("DidDocument", did, "baseDocument", "{}");

    // self controller
    const cId = `${did}#${did}`;
    assert.entityCount("ControllerRelationship", 1);
    assert.fieldEquals("ControllerRelationship", cId, "controller", did);
    assert.fieldEquals(
      "ControllerRelationship",
      cId,
      "controlledDocument",
      did,
    );
    assert.fieldEquals("ControllerRelationship", cId, "status", "Active");

    // verification method
    const vmId = `${did}#keys-1`;
    assert.entityCount("VerificationMethod", 1);
    assert.fieldEquals("VerificationMethod", vmId, "did", did);
    assert.fieldEquals("VerificationMethod", vmId, "isSecp256k1", "true");
    assert.fieldEquals(
      "VerificationMethod",
      vmId,
      "publicKey",
      "0xff1234567890",
    );
    assert.fieldEquals("VerificationMethod", vmId, "status", "Active");

    // two relationships
    assert.entityCount("VerificationRelationship", 2);

    const vrId1 = `${did} capabilityInvocation keys-1`;
    const vrId2 = `${did} authentication keys-1`;
    assert.fieldEquals(
      "VerificationRelationship",
      vrId1,
      "vMethodId",
      "keys-1",
    );
    assert.fieldEquals("VerificationRelationship", vrId1, "notBefore", "1000");
    assert.fieldEquals("VerificationRelationship", vrId1, "notAfter", "2000");

    assert.fieldEquals(
      "VerificationRelationship",
      vrId2,
      "name",
      "authentication",
    );
    assert.fieldEquals("VerificationRelationship", vrId2, "notBefore", "1000");
    assert.fieldEquals("VerificationRelationship", vrId2, "notAfter", "2000");
  });

  test("Update base document", () => {
    const newBaseDocument = '{"@context":"https://www.w3.org/ns/did/v1"}';
    const event = createBaseDocumentUpdatedEvent(did, newBaseDocument);
    const eventId = computeEventId(event);
    handleBaseDocumentUpdated(event);

    assert.fieldEquals("Event", eventId, "did", did);
    assert.entityCount("DidDocument", 1);
    assert.fieldEquals("DidDocument", did, "baseDocument", newBaseDocument);
  });

  test("Add verification method", () => {
    const event = createVerificationMethodAddedEvent(
      did,
      "keys-2",
      Bytes.fromHexString("7b226b7479223a"),
      false,
    );
    const eventId = computeEventId(event);
    handleVerificationMethodAdded(event);

    const id = `${did}#keys-2`;
    assert.fieldEquals("Event", eventId, "did", did);
    assert.entityCount("VerificationMethod", 2);
    assert.fieldEquals("VerificationMethod", id, "did", did);
    assert.fieldEquals(
      "VerificationMethod",
      id,
      "publicKey",
      "0x7b226b7479223a",
    );
    assert.fieldEquals("VerificationMethod", id, "isSecp256k1", "false");
    assert.fieldEquals("VerificationMethod", id, "status", "Active");
  });

  test("Add verification relationship", () => {
    // TODO: vrId should be keccak256(abi.encodePacked("assertionMethod", "keys-1")));
    const vrIdBigInt = BigInt.fromI32(1);
    const event = createVerificationRelationshipAddedEvent(
      vrIdBigInt,
      did,
      "assertionMethod",
      "keys-1",
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );
    const eventId = computeEventId(event);
    handleVerificationRelationshipAdded(event);

    assert.fieldEquals("Event", eventId, "did", did);
    assert.entityCount("VerificationRelationship", 3);
    const vrId = `${did} assertionMethod keys-1`;
    assert.fieldEquals("VerificationRelationship", vrId, "did", did);
    assert.fieldEquals("VerificationRelationship", vrId, "vMethodId", "keys-1");
    assert.fieldEquals(
      "VerificationRelationship",
      vrId,
      "name",
      "assertionMethod",
    );
    assert.fieldEquals("VerificationRelationship", vrId, "notBefore", "1000");
    assert.fieldEquals("VerificationRelationship", vrId, "notAfter", "2000");
  });

  test("Update verification relationship", () => {
    const vrIdBigInt = BigInt.fromI32(1);
    const event = createVerificationRelationshipUpdatedEvent(
      vrIdBigInt,
      did,
      "assertionMethod",
      "keys-1",
      BigInt.fromI32(1500),
    );
    const eventId = computeEventId(event);
    handleVerificationRelationshipUpdated(event);

    assert.fieldEquals("Event", eventId, "did", did);
    assert.entityCount("VerificationRelationship", 3);
    const vrId = `${did} assertionMethod keys-1`;
    assert.fieldEquals("VerificationRelationship", vrId, "did", did);
    assert.fieldEquals("VerificationRelationship", vrId, "vMethodId", "keys-1");
    assert.fieldEquals(
      "VerificationRelationship",
      vrId,
      "name",
      "assertionMethod",
    );
    assert.fieldEquals("VerificationRelationship", vrId, "notBefore", "1000");
    assert.fieldEquals("VerificationRelationship", vrId, "notAfter", "1500");
  });

  test("Revoke verification method", () => {
    const event = createVerificationMethodRevokedEvent(
      did,
      "keys-1",
      BigInt.fromI32(1500),
    );
    const eventId = computeEventId(event);
    handleVerificationMethodRevoked(event);

    const id = `${did}#keys-1`;
    assert.fieldEquals("Event", eventId, "did", did);
    assert.entityCount("VerificationMethod", 2);
    assert.fieldEquals("VerificationMethod", id, "status", "Revoked");
  });

  test("Add controller", () => {
    // create another did
    const did2 = "did:ebsi:2";
    const eventInsertDid = createDidDocumentInsertedEvent(
      did2,
      "{}",
      "keys-1",
      Bytes.fromHexString("aabbccddeeff"),
      true,
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );
    handleDidDocumentInserted(eventInsertDid);

    // add this did as controller
    const event = createControllerAddedEvent(did, did2);
    const eventId = computeEventId(event);
    handleControllerAdded(event);

    const id = `${did}#${did2}`;
    assert.fieldEquals("Event", eventId, "did", did);
    assert.entityCount("ControllerRelationship", 3);
    assert.fieldEquals("ControllerRelationship", id, "controller", did2);
    assert.fieldEquals("ControllerRelationship", id, "controlledDocument", did);
    assert.fieldEquals("ControllerRelationship", id, "status", "Active");
  });
});
