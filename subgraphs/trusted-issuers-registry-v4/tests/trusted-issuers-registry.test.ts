import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
} from "matchstick-as/assembly/index";
import { Bytes } from "@graphprotocol/graph-ts";
import {
  handleAttributeMetadataUpdated,
  handleAttributeDataUpdated,
  handleProxyUpdated,
  handleProxyRemoved,
} from "../src/trusted-issuers-registry";
import {
  createAttributeMetadataUpdated,
  createAttributeDataUpdated,
  createProxyUpdated,
  createProxyRemoved,
} from "./trusted-issuers-registry-utils";

describe("Trusted Issuers Registry - entity assertions", () => {
  const rootTao = "did:ebsi:roottao";
  const tao = "did:ebsi:tao";
  const did = "did:ebsi:1";
  const attributeId = "0xba32";
  const attributeData = "eyJhbGciOiJF...";
  const proxyId = "0x18c6";
  const proxyData = "{ proxy data ... }";

  beforeAll(() => {
    const event = createAttributeMetadataUpdated(
      did,
      Bytes.fromHexString(attributeId),
      3,
      tao,
      rootTao,
      Bytes.fromHexString(attributeId),
    );

    handleAttributeMetadataUpdated(event);
  });

  afterAll(() => {
    clearStore();
  });

  test("Insert attribute metadata", () => {
    assert.entityCount("Issuer", 1);
    assert.entityCount("Attribute", 1);
    assert.entityCount("Revision", 1);
    assert.fieldEquals("Issuer", did, "attributes", `[${attributeId}]`);
    assert.fieldEquals("Attribute", attributeId, "lastRevision", attributeId);
    assert.fieldEquals(
      "Attribute",
      attributeId,
      "revisions",
      `[${attributeId}]`,
    );
    assert.fieldEquals("Revision", attributeId, "issuerType", "TI");
    assert.fieldEquals("Revision", attributeId, "tao", tao);
    assert.fieldEquals("Revision", attributeId, "rootTao", rootTao);
  });

  test("Insert attribute data", () => {
    const newRevision = "0xaa16";
    const event = createAttributeDataUpdated(
      did,
      Bytes.fromHexString(attributeId),
      3,
      tao,
      rootTao,
      Bytes.fromHexString(newRevision),
      Bytes.fromUTF8(attributeData),
    );
    handleAttributeDataUpdated(event);

    assert.entityCount("Issuer", 1);
    assert.entityCount("Attribute", 1);
    assert.entityCount("Revision", 2);
    assert.fieldEquals("Issuer", did, "attributes", `[${attributeId}]`);
    assert.fieldEquals("Attribute", attributeId, "lastRevision", newRevision);
    assert.fieldEquals(
      "Attribute",
      attributeId,
      "revisions",
      `[${attributeId}, ${newRevision}]`,
    );
    assert.fieldEquals("Revision", newRevision, "issuerType", "TI");
    assert.fieldEquals("Revision", newRevision, "tao", tao);
    assert.fieldEquals("Revision", newRevision, "rootTao", rootTao);
    assert.fieldEquals("Revision", newRevision, "data", attributeData);
  });

  test("Insert issuer proxy", () => {
    const event = createProxyUpdated(
      did,
      Bytes.fromHexString(proxyId),
      proxyData,
    );
    handleProxyUpdated(event);

    assert.entityCount("Issuer", 1);
    assert.entityCount("Proxy", 1);
    assert.fieldEquals("Issuer", did, "proxies", `[${proxyId}]`);
    assert.fieldEquals("Proxy", proxyId, "data", proxyData);
  });

  test("Remove issuer proxy", () => {
    // adding a second one
    const proxyId2 = "0x56";
    const proxyData2 = "{ second proxy }";
    const addEvent = createProxyUpdated(
      did,
      Bytes.fromHexString(proxyId2),
      proxyData2,
    );
    handleProxyUpdated(addEvent);

    assert.entityCount("Issuer", 1);
    assert.entityCount("Proxy", 2);
    assert.fieldEquals("Issuer", did, "proxies", `[${proxyId}, ${proxyId2}]`);
    assert.fieldEquals("Proxy", proxyId2, "data", proxyData2);

    // removing it
    const event = createProxyRemoved(did, Bytes.fromHexString(proxyId2));
    handleProxyRemoved(event);

    assert.entityCount("Issuer", 1);
    assert.entityCount("Proxy", 1); // only 1 proxy
    assert.fieldEquals("Issuer", did, "proxies", `[${proxyId}]`);
    assert.notInStore("Proxy", proxyId2);
  });
});
