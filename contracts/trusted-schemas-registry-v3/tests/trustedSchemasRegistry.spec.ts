import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { randomBytes } from "node:crypto";

import type {
  TrustedPoliciesRegistryMock,
  TrustedSchemasRegistry,
  TrustedSchemasRegistry__factory,
} from "../src/types";

import { testTprAddress } from "./testAddress";

function randomBytesHex(length: number) {
  return `0x${randomBytes(length).toString("hex")}`;
}

describe("Trusted Schemas Registry", () => {
  let tsr: TrustedSchemasRegistry;
  let tprMock: TrustedPoliciesRegistryMock;
  let contractFactory: TrustedSchemasRegistry__factory;
  let upgrader: SignerWithAddress;
  let admin: SignerWithAddress;

  before(async () => {
    [upgrader, admin] = await ethers.getSigners();
    const policyRegistryFactory = await ethers.getContractFactory(
      "TrustedPoliciesRegistryMock",
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    const bytecode = await ethers.provider.getCode(
      await tempPolicyContract.getAddress(),
    );
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    tprMock = policyRegistryFactory.attach(
      testTprAddress,
    ) as TrustedPoliciesRegistryMock;

    contractFactory = await ethers.getContractFactory("TrustedSchemasRegistry");
    tsr = (
      await upgrades.deployProxy(
        contractFactory,
        [upgrader.address, testTprAddress],
        { unsafeAllowLinkedLibraries: true },
      )
    ).connect(admin);
  });

  beforeEach(async () => {
    await tprMock.setPolicyResult(true);
  });

  it("should be already initialized", async () => {
    const newUpgrader = "0xbBfe1fEf1cdF1Edf742922ED55c054b00e05f0eB";
    const newTpr = "0x4D82b508f5EE854E7D04192fFc8986cE3F15818E";
    await expect(tsr.initialize(newUpgrader, newTpr)).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  describe("Upgrade contract", () => {
    it("should fail if user is not upgrader", async () => {
      const newImplementation = await contractFactory.deploy();
      await expect(
        tsr.upgradeTo(await newImplementation.getAddress()),
      ).to.be.revertedWith("not upgrader");
    });

    it("should upgrade contract with a new implementation", async () => {
      const newImplementation = await contractFactory.deploy();
      const tsrWithUpgrader = tsr.connect(upgrader);
      await tsrWithUpgrader.upgradeTo(await newImplementation.getAddress());
    });
  });

  describe("Insert schema", () => {
    it("should fail when user does not have attribute in TPR", async () => {
      await tprMock.setPolicyResult(false);
      await expect(tsr.insertSchema("0x00", "0x00", "0x00")).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TSR:insertSchema",
      );
    });

    it("should fail if the schema is already registered", async () => {
      const schemaId = randomBytesHex(10);
      const content = randomBytesHex(100);
      const metadata = randomBytesHex(10);
      await tsr.insertSchema(schemaId, content, metadata);

      await expect(
        tsr.insertSchema(schemaId, "0x01", "0x01"),
      ).to.be.revertedWith("schema exists");
    });

    it("should fail if the revision is already registered", async () => {
      const schemaId = randomBytesHex(10);
      const content = randomBytesHex(100);
      const metadata = randomBytesHex(10);
      await tsr.insertSchema(schemaId, content, metadata);

      const schemaId2 = randomBytesHex(10);
      await expect(
        tsr.insertSchema(schemaId2, content, "0x01"),
      ).to.be.revertedWith("revision exists");
    });

    it("should insert a schema and emit event", async () => {
      const schemaId = randomBytesHex(10);
      const content = randomBytesHex(100);
      const metadata = randomBytesHex(10);
      const revisionId = ethers.sha256(content);
      const metadataId = ethers.sha256(metadata);
      await expect(tsr.insertSchema(schemaId, content, metadata))
        .to.emit(tsr, "SchemaInserted")
        .withArgs(schemaId, revisionId, metadataId, content, metadata);
    });
  });

  describe("Update schema", () => {
    const schemaId = randomBytesHex(10);
    const content = randomBytesHex(100);
    const metadata = randomBytesHex(10);

    before(async () => {
      await tsr.insertSchema(schemaId, content, metadata);
    });

    it("should fail when user does not have attribute in TPR", async () => {
      await tprMock.setPolicyResult(false);
      await expect(tsr.updateSchema("0x00", "0x00", "0x00")).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TSR:updateSchema",
      );
    });

    it("should fail if the schema does not exist", async () => {
      const schemaId2 = randomBytesHex(10);
      await expect(
        tsr.updateSchema(schemaId2, "0x00", "0x00"),
      ).to.be.revertedWith("schema does not exist");
    });

    it("should fail if the revision is already registered", async () => {
      // insert a second schema
      const schemaId2 = randomBytesHex(10);
      const content2 = randomBytesHex(100);
      const metadata2 = randomBytesHex(10);
      await tsr.insertSchema(schemaId2, content2, metadata2);

      // try to update the first schema by using the content of the second one
      await expect(
        tsr.updateSchema(schemaId, content2, "0x00"),
      ).to.be.revertedWith("revision exists");
    });

    it("should update a schema and emit event", async () => {
      const newContent = randomBytesHex(100);
      const newMetadata = randomBytesHex(10);
      const revisionId = ethers.sha256(newContent);
      const metadataId = ethers.sha256(newMetadata);
      await expect(tsr.updateSchema(schemaId, newContent, newMetadata))
        .to.emit(tsr, "SchemaUpdated")
        .withArgs(schemaId, revisionId, metadataId, newContent, newMetadata);
    });
  });

  describe("updateMetadata", () => {
    const schemaId = randomBytesHex(10);
    const content = randomBytesHex(100);
    const metadata = randomBytesHex(10);
    const revisionId = ethers.sha256(content);

    before(async () => {
      await tsr.insertSchema(schemaId, content, metadata);
    });

    it("should fail when user does not have attribute updateMetadata", async () => {
      await tprMock.setPolicyResult(false);
      await expect(tsr.updateMetadata(revisionId, "0x00")).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TSR:updateMetadata",
      );
    });

    it("should fail when the revision id does not exist", async () => {
      const revisionId2 = randomBytesHex(32);
      await expect(tsr.updateMetadata(revisionId2, "0x00")).to.be.revertedWith(
        "schema does not exist",
      );
    });

    it("should update the metadata of a revision and emit event", async () => {
      const newMetadata = randomBytesHex(10);
      const metadataId = ethers.sha256(newMetadata);
      await expect(tsr.updateMetadata(revisionId, newMetadata))
        .to.emit(tsr, "MetadataUpdated")
        .withArgs(revisionId, metadataId, newMetadata);
    });
  });
});
