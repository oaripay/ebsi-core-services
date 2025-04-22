import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  test,
} from "matchstick-as";

import {
  handlePolicyActivated,
  handlePolicyDeactivated,
  handlePolicyInserted,
  handlePolicyUpdated,
  handleUserAttributeDeleted,
  handleUserAttributeInserted,
} from "../src/mappings";
import {
  createPolicyActivatedEvent,
  createPolicyDeactivatedEvent,
  createPolicyInsertedEvent,
  createPolicyUpdatedEvent,
  createUserAttributeDeletedEvent,
  createUserAttributeInsertedEvent,
} from "./utils";

describe("Trusted Policies Registry v2 - entity assertions", () => {
  const policyId = "1";
  const user = "0x6309baa4eed7daed1db2b32cadabe3fe558c5ff3";

  beforeAll(() => {
    const event = createPolicyInsertedEvent(
      BigInt.fromString(policyId),
      "TIR:setAttributeMetadata",
      "description TIR",
    );

    handlePolicyInserted(event);
  });

  afterAll(() => {
    clearStore();
  });

  test("Insert policy", () => {
    assert.entityCount("Policy", 1);
    assert.fieldEquals(
      "Policy",
      policyId,
      "policyName",
      "TIR:setAttributeMetadata",
    );
    assert.fieldEquals("Policy", policyId, "description", "description TIR");
    assert.fieldEquals("Policy", policyId, "status", "true");
  });

  test("Update policy", () => {
    const event = createPolicyUpdatedEvent(
      BigInt.fromString(policyId),
      "description TIR",
      "new description",
    );
    handlePolicyUpdated(event);

    assert.entityCount("Policy", 1);
    assert.fieldEquals("Policy", policyId, "description", "new description");
  });

  test("Activate policy", () => {
    const event = createPolicyActivatedEvent(BigInt.fromString(policyId));
    handlePolicyActivated(event);

    assert.entityCount("Policy", 1);
    assert.fieldEquals("Policy", policyId, "status", "true");
  });

  test("Deactivate policy", () => {
    const event = createPolicyDeactivatedEvent(BigInt.fromString(policyId));
    handlePolicyDeactivated(event);

    assert.entityCount("Policy", 1);
    assert.fieldEquals("Policy", policyId, "status", "false");
  });

  test("Insert user attribute", () => {
    const userAddress = new Address(20);
    userAddress.set(Bytes.fromByteArray(Bytes.fromHexString(user)));
    let event = createUserAttributeInsertedEvent(
      userAddress,
      "TIR:setAttributeMetadata",
    );
    handleUserAttributeInserted(event);

    assert.entityCount("User", 1);
    assert.fieldEquals(
      "User",
      user,
      "attributes",
      "[TIR:setAttributeMetadata]",
    );

    event = createUserAttributeInsertedEvent(userAddress, "TSR:insertSchema");
    handleUserAttributeInserted(event);

    assert.entityCount("User", 1);
    assert.fieldEquals(
      "User",
      user,
      "attributes",
      "[TIR:setAttributeMetadata, TSR:insertSchema]",
    );
  });

  test("Delete user attribute", () => {
    const userAddress = new Address(20);
    userAddress.set(Bytes.fromByteArray(Bytes.fromHexString(user)));
    let event = createUserAttributeDeletedEvent(
      userAddress,
      "TIR:setAttributeMetadata",
    );
    handleUserAttributeDeleted(event);

    assert.entityCount("User", 1);
    assert.fieldEquals("User", user, "attributes", "[TSR:insertSchema]");

    event = createUserAttributeDeletedEvent(userAddress, "TSR:insertSchema");
    handleUserAttributeDeleted(event);

    assert.entityCount("User", 1);
    assert.fieldEquals("User", user, "attributes", "[]");
  });
});
