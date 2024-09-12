import { assert, describe, test, clearStore, afterAll } from "matchstick-as";
import { Bytes } from "@graphprotocol/graph-ts";
import {
  handleDidEbsiAuthorised,
  handleDocumentCreated,
  handleDocumentRemoved,
  handleAccessGranted,
  handleAccessRevoked,
  handleEventWritten,
} from "../src/track-and-trace";
import {
  createDidEbsiAuthorisedEvent,
  createDocumentCreatedEvent,
  createDocumentRemovedEvent,
  createAccessGrantedEvent,
  createAccessRevokedEvent,
  createEventWrittenEvent,
} from "./track-and-trace-utils";

describe("Track and Trace - entity assertions", () => {
  afterAll(() => {
    clearStore();
  });

  const creator = "did:ebsi:zgUB1p2zNmGtymUwzHrxh24";
  const creatorHex =
    "0x6469643a656273693a7a6755423170327a4e6d4774796d55777a487278683234";
  // const subject = "did:ebsi:z256asBWmHBsj2ZNVxG5Mhkp";
  const subjectHex =
    "0x6469643a656273693a7a323536617342576d4842736a325a4e567847354d686b70";
  const docId =
    "0x698214a0fde86449d48c93cca9bb939f3d8af451646b36162727c16b1ab02fce";
  const docTimeNumber = 1722930142;
  const docTime = "1722930142";
  const docProof =
    "0x0000000000000000000000000000000000000000000000000000000000b874b2";

  test(
    "throw error for an invalid input",
    () => {
      const event = createAccessRevokedEvent(docId, subjectHex, creatorHex);
      // input pointing to a different function signature
      event.transaction.input = Bytes.fromHexString(
        "0xff421956000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000206469643a656273693a7a6755423170327a4e6d4774796d55777a48727868323400000000000000000000000000000000000000000000000000000000000000206469643a656273693a7a6755423170327a4e6d4774796d55777a487278683234",
      );
      handleAccessRevoked(event);
    },
    true,
  );

  test("register a new creator", () => {
    const event = createDidEbsiAuthorisedEvent(creator, true);
    handleDidEbsiAuthorised(event);

    assert.entityCount("Creator", 1);
    assert.fieldEquals("Creator", creator, "active", "true");
    assert.fieldEquals("Creator", creator, "documents", "[]");
  });

  test("register new document", () => {
    const event = createDocumentCreatedEvent(
      docId,
      "metadata1",
      creator,
      docTimeNumber,
      "block",
      docProof,
    );
    handleDocumentCreated(event);

    const invitationId = `${docId}${creatorHex}c`;

    assert.entityCount("Creator", 1);
    assert.fieldEquals("Creator", creator, "active", "true");
    assert.fieldEquals("Creator", creator, "documents", `[${docId}]`);

    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[]");
    assert.fieldEquals("Document", docId, "invitations", `[${invitationId}]`);

    assert.entityCount("Invitation", 1);
    assert.fieldEquals("Invitation", invitationId, "type", "creator");
    assert.fieldEquals("Invitation", invitationId, "grantedBy", creatorHex);
    assert.fieldEquals("Invitation", invitationId, "subject", creatorHex);
    assert.fieldEquals("Invitation", invitationId, "children", "[]");

    assert.entityCount("Operator", 1);
    assert.fieldEquals(
      "Operator",
      creatorHex,
      "invitations",
      `[${invitationId}]`,
    );
  });

  test("grant write access to another account", () => {
    const event = createAccessGrantedEvent(
      docId,
      subjectHex,
      creatorHex,
      "write",
    );
    handleAccessGranted(event);

    const invitationId = `${docId}${subjectHex}1`;
    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c, ${invitationId}]`,
    );

    assert.entityCount("Invitation", 2);
    assert.fieldEquals("Invitation", invitationId, "type", "write");
    assert.fieldEquals("Invitation", invitationId, "grantedBy", creatorHex);
    assert.fieldEquals("Invitation", invitationId, "subject", subjectHex);
    assert.fieldEquals("Invitation", invitationId, "children", "[]");

    assert.entityCount("Operator", 2);
    assert.fieldEquals(
      "Operator",
      subjectHex,
      "invitations",
      `[${invitationId}]`,
    );
  });

  test("revoke write access to another account", () => {
    const event = createAccessRevokedEvent(docId, subjectHex, creatorHex);
    /**
     * input taken from transaction hash
     * https://blockscout-test.ebsi.eu/tx/0x5db18c28c350a192ceda953e63591e9c33abbc6e7649e7a0d8f3f81d1dab7d5e
     * (revokeAccess)
     */
    event.transaction.input = Bytes.fromHexString(
      "0x03b5b932698214a0fde86449d48c93cca9bb939f3d8af451646b36162727c16b1ab02fce000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000206469643a656273693a7a6755423170327a4e6d4774796d55777a48727868323400000000000000000000000000000000000000000000000000000000000000216469643a656273693a7a323536617342576d4842736a325a4e567847354d686b7000000000000000000000000000000000000000000000000000000000000000",
    );
    handleAccessRevoked(event);

    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c]`,
    );

    assert.entityCount("Invitation", 1);

    assert.entityCount("Operator", 2);
    assert.fieldEquals("Operator", subjectHex, "invitations", "[]");
  });

  test("grant delegate access to another account and write access to children", () => {
    const event = createAccessGrantedEvent(
      docId,
      subjectHex,
      creatorHex,
      "delegate",
    );
    handleAccessGranted(event);

    const invDelegate = `${docId}${subjectHex}0`;
    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c, ${invDelegate}]`,
    );

    assert.entityCount("Invitation", 2);
    assert.fieldEquals("Invitation", invDelegate, "type", "delegate");
    assert.fieldEquals("Invitation", invDelegate, "grantedBy", creatorHex);
    assert.fieldEquals("Invitation", invDelegate, "subject", subjectHex);
    assert.fieldEquals("Invitation", invDelegate, "children", "[]");

    assert.entityCount("Operator", 2);
    assert.fieldEquals(
      "Operator",
      subjectHex,
      "invitations",
      `[${invDelegate}]`,
    );

    // create children
    const eventChildren = createAccessGrantedEvent(
      docId,
      "0xaa79",
      subjectHex,
      "write",
    );
    handleAccessGranted(eventChildren);

    const invChild = `${docId}0xaa791`;
    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c, ${invDelegate}, ${invChild}]`,
    );

    assert.entityCount("Invitation", 3);
    // parent with a child
    assert.fieldEquals("Invitation", invDelegate, "type", "delegate");
    assert.fieldEquals("Invitation", invDelegate, "grantedBy", creatorHex);
    assert.fieldEquals("Invitation", invDelegate, "subject", subjectHex);
    assert.fieldEquals("Invitation", invDelegate, "children", `[${invChild}]`);
    // child
    assert.fieldEquals("Invitation", invChild, "type", "write");
    assert.fieldEquals("Invitation", invChild, "grantedBy", subjectHex);
    assert.fieldEquals("Invitation", invChild, "subject", "0xaa79");
    assert.fieldEquals("Invitation", invChild, "children", "[]");

    assert.entityCount("Operator", 3);
    assert.fieldEquals(
      "Operator",
      subjectHex,
      "invitations",
      `[${invDelegate}]`,
    );
    assert.fieldEquals("Operator", "0xaa79", "invitations", `[${invChild}]`);
  });

  test("revoke delegate access to another account and revoke in cascade", () => {
    const event = createAccessRevokedEvent(docId, subjectHex, creatorHex);
    /**
     * input to revoke delegate access
     */
    event.transaction.input = Bytes.fromHexString(
      "0x03b5b932698214a0fde86449d48c93cca9bb939f3d8af451646b36162727c16b1ab02fce000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000206469643a656273693a7a6755423170327a4e6d4774796d55777a48727868323400000000000000000000000000000000000000000000000000000000000000216469643a656273693a7a323536617342576d4842736a325a4e567847354d686b7000000000000000000000000000000000000000000000000000000000000000",
    );
    handleAccessRevoked(event);

    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c]`,
    );

    assert.entityCount("Invitation", 1);

    assert.entityCount("Operator", 3);
    assert.fieldEquals("Operator", subjectHex, "invitations", "[]");
    assert.fieldEquals("Operator", "0xaa79", "invitations", "[]");
  });

  test("write an event", () => {
    const event = createEventWrittenEvent(
      docId,
      "0xeeda",
      creatorHex,
      "metadata2",
      "origin1",
      1722931438,
      "block",
      "0xb87554",
    );
    /**
     * input taken from transaction hash
     * https://blockscout-test.ebsi.eu/tx/0xbb39133ba217b6c49092689269d2ae6f838a74e8f938b025c088aac890c57f46
     * (writeEvent)
     */
    event.transaction.input = Bytes.fromHexString(
      "0x6c3705790000000000000000000000000000000000000000000000000000000000000020698214a0fde86449d48c93cca9bb939f3d8af451646b36162727c16b1ab02fce00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000004230783936326631376332363361373965333166643432636336663634323638656237636564353065323834666330646435626530646430366331623463613962323200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000206469643a656273693a7a6755423170327a4e6d4774796d55777a48727868323400000000000000000000000000000000000000000000000000000000000000076f726967696e310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000096d65746164617461320000000000000000000000000000000000000000000000",
    );
    handleEventWritten(event);

    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[0xeeda]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c]`,
    );

    assert.entityCount("Event", 1);
    assert.fieldEquals(
      "Event",
      "0xeeda",
      "externalHash",
      "0x962f17c263a79e31fd42cc6f64268eb7ced50e284fc0dd5be0dd06c1b4ca9b22",
    );
    assert.fieldEquals("Event", "0xeeda", "hash", "0xeeda");
    assert.fieldEquals("Event", "0xeeda", "timestamp", "1722931438");
    assert.fieldEquals("Event", "0xeeda", "source", "block");
    assert.fieldEquals("Event", "0xeeda", "proof", "0xb87554");
    assert.fieldEquals("Event", "0xeeda", "sender", creatorHex);
    assert.fieldEquals("Event", "0xeeda", "origin", "origin1");
    assert.fieldEquals("Event", "0xeeda", "metadata", "metadata2");
  });

  test("remove document", () => {
    // create some invitations
    const eventInv1 = createAccessGrantedEvent(
      docId,
      "0xa210",
      creatorHex,
      "delegate",
    );
    handleAccessGranted(eventInv1);
    const eventInv2 = createAccessGrantedEvent(
      docId,
      "0xa210",
      creatorHex,
      "write",
    );
    handleAccessGranted(eventInv2);
    const eventInv3 = createAccessGrantedEvent(
      docId,
      "0x0101",
      "0xa210",
      "write",
    );
    handleAccessGranted(eventInv3);

    const inv1 = `${docId}0xa2100`;
    const inv2 = `${docId}0xa2101`;
    const inv3 = `${docId}0x01011`;

    assert.entityCount("Document", 1);
    assert.fieldEquals("Document", docId, "creator", creator);
    assert.fieldEquals("Document", docId, "timestamp", docTime);
    assert.fieldEquals("Document", docId, "source", "block");
    assert.fieldEquals("Document", docId, "proof", docProof);
    assert.fieldEquals("Document", docId, "metadata", "metadata1");
    assert.fieldEquals("Document", docId, "events", "[0xeeda]");
    assert.fieldEquals(
      "Document",
      docId,
      "invitations",
      `[${docId}${creatorHex}c, ${inv1}, ${inv2}, ${inv3}]`,
    );

    assert.entityCount("Creator", 1);
    assert.fieldEquals("Creator", creator, "active", "true");
    assert.fieldEquals("Creator", creator, "documents", `[${docId}]`);

    assert.entityCount("Invitation", 4);
    assert.fieldEquals("Invitation", inv1, "type", "delegate");
    assert.fieldEquals("Invitation", inv1, "grantedBy", creatorHex);
    assert.fieldEquals("Invitation", inv1, "subject", "0xa210");
    assert.fieldEquals("Invitation", inv1, "children", `[${inv3}]`);
    assert.fieldEquals("Invitation", inv2, "type", "write");
    assert.fieldEquals("Invitation", inv2, "grantedBy", creatorHex);
    assert.fieldEquals("Invitation", inv2, "subject", "0xa210");
    assert.fieldEquals("Invitation", inv2, "children", "[]");
    assert.fieldEquals("Invitation", inv3, "type", "write");
    assert.fieldEquals("Invitation", inv3, "grantedBy", "0xa210");
    assert.fieldEquals("Invitation", inv3, "subject", "0x0101");
    assert.fieldEquals("Invitation", inv3, "children", "[]");

    assert.entityCount("Operator", 5);
    assert.fieldEquals(
      "Operator",
      "0xa210",
      "invitations",
      `[${inv1}, ${inv2}]`,
    );
    assert.fieldEquals("Operator", "0x0101", "invitations", `[${inv3}]`);

    // the document is then removed
    const event = createDocumentRemovedEvent(docId);
    handleDocumentRemoved(event);

    assert.entityCount("Document", 0);

    assert.entityCount("Creator", 1);
    assert.fieldEquals("Creator", creator, "active", "true");
    assert.fieldEquals("Creator", creator, "documents", "[]");

    assert.entityCount("Invitation", 0);

    assert.entityCount("Operator", 5);
    assert.fieldEquals("Operator", "0xa210", "invitations", "[]");
    assert.fieldEquals("Operator", "0x0101", "invitations", "[]");
  });
});
