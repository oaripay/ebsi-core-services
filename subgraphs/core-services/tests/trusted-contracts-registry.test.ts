import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  test,
} from "matchstick-as";

import {
  ContractProxy,
  ContractTemplate,
  DidDocument,
} from "../generated/schema";
import { handleProxyDeployedEvent } from "../src/trusted-contracts-registry-v1/proxy-factory/mappings";
import {
  handleTemplateAddedEvent,
  handleTemplateDeprecatedEvent,
  handleTemplateUpdatedEvent,
} from "../src/trusted-contracts-registry-v1/proxy-template-registry/mappings";
import {
  createProxyDeployedEvent,
  createTemplateAddedEvent,
  createTemplateDeprecatedEvent,
  createTemplateUpdatedEvent,
  encodeTransactionInput,
} from "./trusted-contracts-registry.utils";

describe("Trusted Contracts Registry - entity assertions", () => {
  beforeAll(() => {
    // Create DID document for the contract deployer
    const didDocument = new DidDocument("did:ebsi:zqz4ibiG9bWhPBiebPeeGVB");
    didDocument.baseDocument = "{}";
    didDocument.save();
  });
  afterAll(() => {
    clearStore();
  });

  test("Add a new template", () => {
    const templateId = Bytes.fromHexString(
      "0x957cef8a6ccfa45ea37ec9976fa2cdeb916d96039d6dac5bd68e37284bc187f4",
    );
    const name = "SampleContract-495e006501ff64fc8c325a0da420d19b";
    const version = "1.0.0";
    const beaconAddress = Address.fromBytes(
      Bytes.fromHexString("0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"),
    );
    const repoURI = "https://github.com/example/sample-contract";
    const auditURI = "https://audit.example.com/sample-contract";
    const contractHash = Bytes.fromHexString(
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
    const initSelector = Bytes.fromHexString("0xd1ec8bf7");
    const storageLayoutHash = Bytes.fromHexString(
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
    const isActive = true;

    const event = createTemplateAddedEvent(templateId, name, version);

    // Create transaction input
    const newTemplate: ethereum.Value[] = [
      ethereum.Value.fromString(name),
      ethereum.Value.fromString(version),
      ethereum.Value.fromAddress(beaconAddress),
      ethereum.Value.fromString(repoURI),
      ethereum.Value.fromString(auditURI),
      ethereum.Value.fromFixedBytes(contractHash),
      ethereum.Value.fromFixedBytes(initSelector),
      ethereum.Value.fromFixedBytes(storageLayoutHash),
      ethereum.Value.fromBoolean(isActive),
    ];
    const tuple: ethereum.Value[] = [
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>(newTemplate)),
    ];

    // Set transaction input
    event.transaction.input = encodeTransactionInput(
      "addTemplate((string,string,address,string,string,bytes32,bytes4,bytes32,bool))",
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>(tuple)),
    );

    handleTemplateAddedEvent(event);

    assert.entityCount(
      "ContractTemplate",
      1,
      "There should be 1 ContractTemplate",
    );

    const contractTemplateEntity = ContractTemplate.load(templateId);

    if (!contractTemplateEntity) {
      throw new Error("ContractTemplate not found");
    }

    assert.stringEquals(name, contractTemplateEntity.name);
    assert.stringEquals(version, contractTemplateEntity.version);
    assert.addressEquals(
      beaconAddress,
      Address.fromBytes(contractTemplateEntity.beaconAddress),
    );
    assert.stringEquals(repoURI, contractTemplateEntity.repoURI);
    assert.stringEquals(auditURI, contractTemplateEntity.auditURI);
    assert.bytesEquals(contractHash, contractTemplateEntity.contractHash);
    assert.bytesEquals(initSelector, contractTemplateEntity.initSelector);
    assert.bytesEquals(
      storageLayoutHash,
      contractTemplateEntity.storageLayoutHash,
    );
    assert.booleanEquals(true, contractTemplateEntity.isActive);
  });

  test("Update a template", () => {
    const templateId = Bytes.fromHexString(
      "0x957cef8a6ccfa45ea37ec9976fa2cdeb916d96039d6dac5bd68e37284bc187f4",
    );

    const repoURI = "https://github.com/example/sample-contract-updated";
    const auditURI = "https://audit.example.com/sample-contract-updated";

    const event = createTemplateUpdatedEvent(templateId, repoURI, auditURI);

    // Create transaction input
    const tuple: ethereum.Value[] = [
      ethereum.Value.fromBytes(templateId),
      ethereum.Value.fromString(repoURI),
      ethereum.Value.fromString(auditURI),
    ];

    // Set transaction input
    event.transaction.input = encodeTransactionInput(
      "updateTemplateMetadata(bytes32,string,string)",
      ethereum.Value.fromTuple(changetype<ethereum.Tuple>(tuple)),
    );

    handleTemplateUpdatedEvent(event);

    assert.entityCount(
      "ContractTemplate",
      1,
      "There should be 1 ContractTemplate",
    );

    const contractTemplateEntity = ContractTemplate.load(templateId);

    if (!contractTemplateEntity) {
      throw new Error("ContractTemplate not found");
    }

    assert.stringEquals(repoURI, contractTemplateEntity.repoURI);
    assert.stringEquals(auditURI, contractTemplateEntity.auditURI);
  });

  test("Deprecate a template", () => {
    const templateId = Bytes.fromHexString(
      "0x957cef8a6ccfa45ea37ec9976fa2cdeb916d96039d6dac5bd68e37284bc187f4",
    );

    const event = createTemplateDeprecatedEvent(templateId);

    handleTemplateDeprecatedEvent(event);

    assert.entityCount(
      "ContractTemplate",
      1,
      "There should be 1 ContractTemplate",
    );

    const contractTemplateEntity = ContractTemplate.load(templateId);

    if (!contractTemplateEntity) {
      throw new Error("ContractTemplate not found");
    }

    assert.booleanEquals(false, contractTemplateEntity.isActive);
  });

  test("Deploy new proxy", () => {
    const proxyAddress = Address.fromBytes(
      Bytes.fromHexString("0x61c36a8d610163660E21a8b7359e1Cac0C9133e1"),
    );
    const templateId = Bytes.fromHexString(
      "0x957cef8a6ccfa45ea37ec9976fa2cdeb916d96039d6dac5bd68e37284bc187f4",
    );
    const deployer = Address.fromBytes(
      Bytes.fromHexString("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"),
    );
    const issuerDID = "did:ebsi:zqz4ibiG9bWhPBiebPeeGVB";
    const initData = Bytes.fromHexString("0x");
    const timestamp = 1_760_600_272;

    const event = createProxyDeployedEvent(
      proxyAddress,
      templateId,
      deployer,
      issuerDID,
      initData,
      timestamp,
    );

    handleProxyDeployedEvent(event);

    assert.entityCount("ContractProxy", 1, "There should be 1 ContractProxy");

    const contractProxyEntity = ContractProxy.load(proxyAddress);

    if (!contractProxyEntity) {
      throw new Error("ContractProxy not found");
    }

    assert.addressEquals(
      deployer,
      Address.fromBytes(contractProxyEntity.deployerAddress),
    );
    assert.bytesEquals(initData, contractProxyEntity.initData);
    assert.booleanEquals(
      true,
      contractProxyEntity.isActive,
      "The contractProxy should be active",
    );
    assert.stringEquals(issuerDID, contractProxyEntity.deployerDidDocument);
    assert.bytesEquals(templateId, contractProxyEntity.template);
    assert.i32Equals(timestamp, contractProxyEntity.timestamp.toI32());

    // Verify relationships
    const template = ContractTemplate.load(contractProxyEntity.template);

    if (!template) {
      throw new Error(
        `ContractTemplate ${contractProxyEntity.template.toHexString()} not found`,
      );
    }

    const proxies = template.proxies.load();
    assert.i32Equals(1, proxies.length);
    assert.bytesEquals(contractProxyEntity.id, proxies[0].id);

    const didDocument = DidDocument.load(
      contractProxyEntity.deployerDidDocument,
    );

    if (!didDocument) {
      throw new Error(
        `DidDocument ${contractProxyEntity.deployerDidDocument} not found`,
      );
    }
  });
});
