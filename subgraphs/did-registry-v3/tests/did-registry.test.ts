import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  countEntities,
  describe,
  test,
} from "matchstick-as/assembly/index";

import {
  handleAddControllerCall,
  handleAddVerificationMethodCall,
  handleAddVerificationRelationshipCall,
  handleExpireVerificationMethodCall,
  handleInsertDidDocumentCall,
  handleRevokeControllerCall,
  handleRevokeVerificationMethodCall,
  handleRollVerificationMethodCall,
  handleUpdateBaseDocumentCall,
} from "../src/mappings";
import { computeEventId } from "../src/utils";
import {
  createAddControllerCall,
  createAddVerificationMethodCall,
  createAddVerificationRelationshipCall,
  createExpireVerificationMethodCall,
  createInsertDidDocumentCall,
  createRevokeControllerCall,
  createRevokeVerificationMethodCall,
  createRollVerificationMethodCall,
  createUpdateBaseDocumentCall,
} from "./did-registry-utils";

describe("DID Registry - entity assertions", () => {
  const did = "did:ebsi:zZeKyEJfUTGwajhNyNX928z";

  beforeAll(() => {
    const call = createInsertDidDocumentCall(
      did,
      "{}",
      "keys-1",
      Bytes.fromHexString("ff1234567890"),
      true,
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );

    handleInsertDidDocumentCall(call);
  });

  afterAll(() => {
    clearStore();
  });

  test("Insert DID document", () => {
    const newDid = "did:ebsi:z224tCapjMEJEdLU6n1iG2yH";
    const keyId = "new-key";

    const insertDidDocumentCall = createInsertDidDocumentCall(
      newDid,
      '{"@context":"https://www.w3.org/ns/did/v1"}',
      keyId,
      Bytes.fromHexString("ddeeffaabbcc"),
      true,
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );

    const didDocumentCount = countEntities("DidDocument");
    const controllerRelationshipCount = countEntities("ControllerRelationship");
    const verificationMethodCount = countEntities("VerificationMethod");
    const verificationRelationshipCount = countEntities(
      "VerificationRelationship",
    );

    handleInsertDidDocumentCall(insertDidDocumentCall);

    // Check if the event has been stored
    const eventId = computeEventId(
      insertDidDocumentCall,
      "InsertDidDocument",
      did,
    );
    assert.fieldEquals("Event", eventId.toHexString(), "did", did);

    // Check if the new DID document has been stored
    assert.entityCount("DidDocument", didDocumentCount + 1);
    assert.fieldEquals(
      "DidDocument",
      newDid,
      "baseDocument",
      '{"@context":"https://www.w3.org/ns/did/v1"}',
    );

    // Check if the new controller relationship has been stored
    assert.entityCount(
      "ControllerRelationship",
      controllerRelationshipCount + 1,
    );

    const cId = `${newDid}#${newDid}`;
    assert.fieldEquals("ControllerRelationship", cId, "controller", newDid);
    assert.fieldEquals(
      "ControllerRelationship",
      cId,
      "controlledDocument",
      newDid,
    );
    assert.fieldEquals("ControllerRelationship", cId, "status", "Active");

    // Check if the new verification method has been stored
    assert.entityCount("VerificationMethod", verificationMethodCount + 1);

    const vmId = `${newDid}#${keyId}`;
    assert.fieldEquals("VerificationMethod", vmId, "did", newDid);
    assert.fieldEquals("VerificationMethod", vmId, "isSecp256k1", "true");
    assert.fieldEquals(
      "VerificationMethod",
      vmId,
      "publicKey",
      "0xddeeffaabbcc",
    );
    assert.fieldEquals("VerificationMethod", vmId, "status", "Active");

    // Check if the new verification relationships ("capabilityInvocation" and "authentication") have been stored
    assert.entityCount(
      "VerificationRelationship",
      verificationRelationshipCount + 2,
    );

    const vrId1 = `${newDid} capabilityInvocation ${keyId}`;
    const vrId2 = `${newDid} authentication ${keyId}`;
    assert.fieldEquals("VerificationRelationship", vrId1, "vMethodId", keyId);
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

    const call = createUpdateBaseDocumentCall(did, newBaseDocument);

    const didDocumentCount = countEntities("DidDocument");

    handleUpdateBaseDocumentCall(call);

    // Check if the event has been stored
    const eventId = computeEventId(call, "UpdateBaseDocument", did);
    assert.fieldEquals("Event", eventId.toHexString(), "did", did);

    // The number of entities has not changed
    assert.entityCount("DidDocument", didDocumentCount);

    // The base document has been updated
    assert.fieldEquals("DidDocument", did, "baseDocument", newBaseDocument);
  });

  test("Add and revoke controller", () => {
    // Create another DID document
    const did2 = "did:ebsi:zsG1AGXCuZ46tSAE2UT6kdE";

    const insertDidDocumentCall = createInsertDidDocumentCall(
      did2,
      "{}",
      "keys-1",
      Bytes.fromHexString("aabbccddeeff"),
      true,
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
    );

    const controllerRelationshipCount = countEntities("ControllerRelationship");

    handleInsertDidDocumentCall(insertDidDocumentCall);

    // Add DID as controller
    const addControllerCall = createAddControllerCall(did, did2);

    handleAddControllerCall(addControllerCall);

    // Check if the event has been stored
    const addControllerEventId = computeEventId(
      addControllerCall,
      "AddController",
      did,
    ).toHexString();
    assert.fieldEquals("Event", addControllerEventId, "did", did);

    // Check if the new controller relationships have been stored
    assert.entityCount(
      "ControllerRelationship",
      controllerRelationshipCount + 2, // 1 was added by handleInsertDidDocumentCall, the other by handleAddControllerCall
    );

    // Check controller relationships
    const crId1 = `${did}#${did}`;
    const crId2 = `${did}#${did2}`;
    assert.fieldEquals("ControllerRelationship", crId1, "controller", did);
    assert.fieldEquals(
      "ControllerRelationship",
      crId1,
      "controlledDocument",
      did,
    );
    assert.fieldEquals("ControllerRelationship", crId1, "status", "Active");
    assert.fieldEquals("ControllerRelationship", crId2, "controller", did2);
    assert.fieldEquals(
      "ControllerRelationship",
      crId2,
      "controlledDocument",
      did,
    );
    assert.fieldEquals("ControllerRelationship", crId2, "status", "Active");

    // Revoke controller
    const revokeControllerCall = createRevokeControllerCall(did, did2);

    handleRevokeControllerCall(revokeControllerCall);

    // Check if the event has been stored
    const revokeControllerEventId = computeEventId(
      revokeControllerCall,
      "RevokeController",
      did,
    ).toHexString();
    assert.fieldEquals("Event", revokeControllerEventId, "did", did);

    // Check if the new controller relationships are still present
    assert.entityCount(
      "ControllerRelationship",
      controllerRelationshipCount + 2, // The count has not changed
    );

    // Check controller relationships
    assert.fieldEquals("ControllerRelationship", crId1, "controller", did);
    assert.fieldEquals(
      "ControllerRelationship",
      crId1,
      "controlledDocument",
      did,
    );
    assert.fieldEquals("ControllerRelationship", crId1, "status", "Active");
    assert.fieldEquals("ControllerRelationship", crId2, "controller", did2);
    assert.fieldEquals(
      "ControllerRelationship",
      crId2,
      "controlledDocument",
      did,
    );
    assert.fieldEquals("ControllerRelationship", crId2, "status", "Revoked");
  });

  test("Add verification method", () => {
    const addVerificationMethodCall = createAddVerificationMethodCall(
      did,
      "keys-2",
      Bytes.fromHexString("7b226b7479223a"),
      false,
    );

    const verificationMethodCount = countEntities("VerificationMethod");

    handleAddVerificationMethodCall(addVerificationMethodCall);

    // Check if the event has been stored
    const eventId = computeEventId(
      addVerificationMethodCall,
      "AddVerificationMethod",
      did,
    ).toHexString();
    assert.fieldEquals("Event", eventId, "did", did);

    // Check if the new verification method has been stored
    assert.entityCount("VerificationMethod", verificationMethodCount + 1);

    // Check verification method
    const id = `${did}#keys-2`;
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
    const addVerificationRelationshipCall =
      createAddVerificationRelationshipCall(
        did,
        "assertionMethod",
        "keys-1",
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
      );

    const verificationRelationshipCount = countEntities(
      "VerificationRelationship",
    );

    handleAddVerificationRelationshipCall(addVerificationRelationshipCall);

    // Check if the event has been stored
    const eventId = computeEventId(
      addVerificationRelationshipCall,
      "AddVerificationRelationship",
      did,
    ).toHexString();
    assert.fieldEquals("Event", eventId, "did", did);

    // Check if the new verification relationship has been stored
    assert.entityCount(
      "VerificationRelationship",
      verificationRelationshipCount + 1,
    );

    // Check verification relationship
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

  test("Revoke verification method", () => {
    const revokeVerificationMethodCall = createRevokeVerificationMethodCall(
      did,
      "keys-1",
      BigInt.fromI32(1500),
    );

    const verificationMethodCount = countEntities("VerificationMethod");

    handleRevokeVerificationMethodCall(revokeVerificationMethodCall);

    // Check if the event has been stored
    const eventId = computeEventId(
      revokeVerificationMethodCall,
      "RevokeVerificationMethod",
      did,
    ).toHexString();
    assert.fieldEquals("Event", eventId, "did", did);

    // The number of entities has not changed
    assert.entityCount("VerificationMethod", verificationMethodCount);

    // The verification method has been revoked
    const id = `${did}#keys-1`;
    assert.fieldEquals("VerificationMethod", id, "status", "Revoked");
  });

  test("Expire verification method", () => {
    const keyId = "key-to-be-revoked";

    // Add new verification method
    const addVerificationMethodCall = createAddVerificationMethodCall(
      did,
      keyId,
      Bytes.fromHexString("7b226b7479223a"),
      false,
    );

    const verificationMethodCount = countEntities("VerificationMethod");

    handleAddVerificationMethodCall(addVerificationMethodCall);

    // Check if the verification method has been stored
    const verificationMethodId = `${did}#${keyId}`;
    assert.entityCount("VerificationMethod", verificationMethodCount + 1);
    assert.fieldEquals("VerificationMethod", verificationMethodId, "did", did);
    assert.fieldEquals(
      "VerificationMethod",
      verificationMethodId,
      "publicKey",
      "0x7b226b7479223a",
    );
    assert.fieldEquals(
      "VerificationMethod",
      verificationMethodId,
      "isSecp256k1",
      "false",
    );
    assert.fieldEquals(
      "VerificationMethod",
      verificationMethodId,
      "status",
      "Active",
    );

    // Add verification relationship
    const addVerificationRelationshipCall =
      createAddVerificationRelationshipCall(
        did,
        "assertionMethod",
        keyId,
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
      );

    const verificationRelationshipCount = countEntities(
      "VerificationRelationship",
    );

    handleAddVerificationRelationshipCall(addVerificationRelationshipCall);

    // Check if the verification relationship has been stored
    assert.entityCount(
      "VerificationRelationship",
      verificationRelationshipCount + 1,
    );
    const vrId = `${did} assertionMethod ${keyId}`;
    assert.fieldEquals("VerificationRelationship", vrId, "did", did);
    assert.fieldEquals("VerificationRelationship", vrId, "vMethodId", keyId);
    assert.fieldEquals(
      "VerificationRelationship",
      vrId,
      "name",
      "assertionMethod",
    );
    assert.fieldEquals("VerificationRelationship", vrId, "notBefore", "1000");
    assert.fieldEquals("VerificationRelationship", vrId, "notAfter", "2000");

    // Expire verification method
    const expireVerificationMethodCall = createExpireVerificationMethodCall(
      did,
      keyId,
      BigInt.fromI32(1500),
    );

    handleExpireVerificationMethodCall(expireVerificationMethodCall);

    // Check if the event has been stored
    const eventId = computeEventId(
      expireVerificationMethodCall,
      "ExpireVerificationMethod",
      did,
    ).toHexString();
    assert.fieldEquals("Event", eventId, "did", did);

    // Check if the verification method is still active
    assert.entityCount("VerificationMethod", verificationMethodCount + 1);
    assert.fieldEquals(
      "VerificationMethod",
      verificationMethodId,
      "status",
      "Active",
    );

    // The verification relationship has an expiration date corresponding to the "notAfter" parameter
    assert.fieldEquals("VerificationRelationship", vrId, "vMethodId", keyId);
    assert.fieldEquals("VerificationRelationship", vrId, "notAfter", "1500");
  });

  test("Roll verification method", () => {
    const initialKeyId = "key-to-be-rolled";

    // Add new verification method
    const addVerificationMethodCall = createAddVerificationMethodCall(
      did,
      initialKeyId,
      Bytes.fromHexString("7b226b7479223a"),
      false,
    );

    const verificationMethodCount = countEntities("VerificationMethod");

    handleAddVerificationMethodCall(addVerificationMethodCall);

    // Check if the verification method has been stored
    const initialVerificationMethodId = `${did}#${initialKeyId}`;
    assert.entityCount("VerificationMethod", verificationMethodCount + 1);
    assert.fieldEquals(
      "VerificationMethod",
      initialVerificationMethodId,
      "did",
      did,
    );
    assert.fieldEquals(
      "VerificationMethod",
      initialVerificationMethodId,
      "publicKey",
      "0x7b226b7479223a",
    );
    assert.fieldEquals(
      "VerificationMethod",
      initialVerificationMethodId,
      "isSecp256k1",
      "false",
    );
    assert.fieldEquals(
      "VerificationMethod",
      initialVerificationMethodId,
      "status",
      "Active",
    );

    // Add verification relationship
    const addVerificationRelationshipCall =
      createAddVerificationRelationshipCall(
        did,
        "assertionMethod",
        initialKeyId,
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
      );

    const verificationRelationshipCount = countEntities(
      "VerificationRelationship",
    );

    handleAddVerificationRelationshipCall(addVerificationRelationshipCall);

    // Check if the verification relationship has been stored
    assert.entityCount(
      "VerificationRelationship",
      verificationRelationshipCount + 1,
    );
    const vrId = `${did} assertionMethod ${initialKeyId}`;
    assert.fieldEquals("VerificationRelationship", vrId, "did", did);
    assert.fieldEquals(
      "VerificationRelationship",
      vrId,
      "vMethodId",
      initialKeyId,
    );
    assert.fieldEquals(
      "VerificationRelationship",
      vrId,
      "name",
      "assertionMethod",
    );
    assert.fieldEquals("VerificationRelationship", vrId, "notBefore", "1000");
    assert.fieldEquals("VerificationRelationship", vrId, "notAfter", "2000");

    // Roll verification method
    const newKeyId = "new-key";
    const rollVerificationMethodCall = createRollVerificationMethodCall(
      did,
      newKeyId,
      Bytes.fromHexString("7b226b7479223b"),
      false,
      BigInt.fromI32(1500),
      BigInt.fromI32(1500),
      initialKeyId,
      BigInt.fromI32(1000),
    );

    handleRollVerificationMethodCall(rollVerificationMethodCall);

    // Check if the event has been stored
    const eventId = computeEventId(
      rollVerificationMethodCall,
      "RollVerificationMethod",
      did,
    ).toHexString();
    assert.fieldEquals("Event", eventId, "did", did);

    // Check if the verification method has been stored
    assert.entityCount("VerificationMethod", verificationMethodCount + 2);

    // Check if the initial verification method is still active
    assert.fieldEquals(
      "VerificationMethod",
      initialVerificationMethodId,
      "status",
      "Active",
    );

    // Check if the new verification method has been stored
    const newVerificationMethodId = `${did}#${newKeyId}`;
    assert.entityCount("VerificationMethod", verificationMethodCount + 2);
    assert.fieldEquals(
      "VerificationMethod",
      newVerificationMethodId,
      "did",
      did,
    );
    assert.fieldEquals(
      "VerificationMethod",
      newVerificationMethodId,
      "publicKey",
      "0x7b226b7479223b",
    );
    assert.fieldEquals(
      "VerificationMethod",
      newVerificationMethodId,
      "isSecp256k1",
      "false",
    );
    assert.fieldEquals(
      "VerificationMethod",
      newVerificationMethodId,
      "status",
      "Active",
    );

    // The old verification relationship has an expiration date corresponding to the initial "notAfter" parameter + the new "duration" parameter
    assert.fieldEquals(
      "VerificationRelationship",
      vrId,
      "vMethodId",
      initialKeyId,
    );
    assert.fieldEquals("VerificationRelationship", vrId, "notAfter", "2500"); // 1500 (initial "notAfter" value) + 1000 (value of "duration")

    // Check if the new verification relationship has been stored
    assert.entityCount(
      "VerificationRelationship",
      verificationRelationshipCount + 2,
    );
    const newVerificationRelationshipId = `${did} assertionMethod ${newKeyId}`;
    assert.fieldEquals(
      "VerificationRelationship",
      newVerificationRelationshipId,
      "did",
      did,
    );
    assert.fieldEquals(
      "VerificationRelationship",
      newVerificationRelationshipId,
      "vMethodId",
      newKeyId,
    );
    assert.fieldEquals(
      "VerificationRelationship",
      newVerificationRelationshipId,
      "name",
      "assertionMethod",
    );
    assert.fieldEquals(
      "VerificationRelationship",
      newVerificationRelationshipId,
      "notBefore",
      "1500",
    );
    assert.fieldEquals(
      "VerificationRelationship",
      newVerificationRelationshipId,
      "notAfter",
      "1500",
    );
  });
});
