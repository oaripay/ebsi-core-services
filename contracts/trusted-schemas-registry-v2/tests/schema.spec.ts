import { ethers, network, upgrades } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";
import { SchemaSCRegistry } from "../src/types";
import { testTprAddress } from "./testAddress";

describe("Schema", () => {
  let ts: Contract;
  let policyContractMock: Contract;

  async function getFactories() {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const pagination = await paginationFactory.deploy();

    const schemaLibFactory = await ethers.getContractFactory("SchemaLib", {
      libraries: {
        Pagination: pagination.address,
      },
    });
    const schemaLib = await schemaLibFactory.deploy();

    const contractFactory = await ethers.getContractFactory(
      "SchemaSCRegistry",
      {
        libraries: {
          SchemaLib: schemaLib.address,
        },
      },
    );

    return {
      paginationFactory,
      schemaLibFactory,
      contractFactory,
    };
  }

  before(async () => {
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
  });

  beforeEach(async () => {
    const { contractFactory } = await getFactories();
    ts = (await contractFactory.deploy(testTprAddress)) as SchemaSCRegistry;
    await policyContractMock.setPolicyResult(true);
  });

  it("should get current version", async () => {
    await expect((await ts.version()).toString()).to.equal("0");
  });

  it("should not initialize if not proxy", async () => {
    await expect(ts.initialize(1)).to.be.revertedWith(
      "Initializable: contract is already initialized",
    );
  });

  it("should initialize if proxy", async () => {
    const { contractFactory } = await getFactories();
    const tsProxy = await upgrades.deployProxy(contractFactory, [42], {
      unsafeAllow: [
        "constructor",
        "external-library-linking",
        "state-variable-immutable",
      ],
      constructorArgs: [testTprAddress],
    });
    await tsProxy.deployed();
    await expect((await tsProxy.version()).toString()).to.equal("42");
  });

  it("should fail with invalid construct args", async () => {
    const { contractFactory } = await getFactories();
    expect(
      upgrades.deployProxy(contractFactory, [42], {
        unsafeAllow: [
          "constructor",
          "external-library-linking",
          "state-variable-immutable",
        ],
        constructorArgs: [ethers.constants.AddressZero],
      }),
    ).to.be.revertedWith("zero address");
  });

  it("should fail when user does not have attribute insertSchema", async () => {
    await policyContractMock.setPolicyResult(false);
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("revision");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    await expect(
      ts.insertSchema(schemaId, schemaRevision, metadata),
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TSR:insertSchema",
    );
  });

  it("insertSchema fails for empty params", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await expect(ts.insertSchema([], [], [])).to.be.revertedWith(
      "schema empty",
    );
    await expect(ts.insertSchema(schemaId, [], [])).to.be.revertedWith(
      "revision empty",
    );
    await expect(
      ts.insertSchema(schemaId, schemaRevision, []),
    ).to.be.revertedWith("metadata empty");
  });

  it("insertSchema fails when already registered", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    await ts.insertSchema(schemaId, schemaRevision, metadata);

    const schemaId2 = ethers.utils.toUtf8Bytes("other schemaId");
    const metadataId2 = ethers.utils.toUtf8Bytes("other metadata");
    await expect(
      ts.insertSchema(schemaId, schemaRevision, metadataId2),
    ).to.be.revertedWith("Schema already registered");
    await expect(
      ts.insertSchema(schemaId2, schemaRevision, metadataId2),
    ).to.be.revertedWith("Revision already exist.");
  });

  it("insertSchema should succeed", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("revision");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    await expect(ts.insertSchema(schemaId, schemaRevision, metadata))
      .to.emit(ts, "SchemaInserted")
      .withArgs(
        ethers.utils.hexlify(schemaId),
        ethers.utils.hexlify(schemaRevision),
        ethers.utils.hexlify(metadata),
      );
    const insertedSchema = await ts.getSchemaRevision(
      ethers.utils.sha256(schemaRevision),
    );
    expect(insertedSchema).to.equal(ethers.utils.hexlify(schemaRevision));
  });

  it("should fail when user does not have attribute updateSchema", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("revision");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    await ts.insertSchema(schemaId, schemaRevision, metadata);
    await policyContractMock.setPolicyResult(false);
    await expect(
      ts.updateSchema(schemaId, schemaRevision, metadata),
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TSR:updateSchema",
    );
  });

  it("getSchemaIds should fail with wrong page and pageSize", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    await ts.insertSchema(schemaId, schemaRevision, metadata);

    // page = 0 should revert
    await expect(ts.getSchemaIds(0, 1)).to.be.revertedWith("Page must be > 0");

    // pagesize = 0 should revert
    await expect(ts.getSchemaIds(1, 0)).to.be.revertedWith(
      "PageSize must be > 0",
    );

    // pagesize > 50 should revert
    await expect(ts.getSchemaIds(1, 51)).to.be.revertedWith(
      "PageSize must be <= 50",
    );
  });

  it("getSchemaIds should succeed", async () => {
    const schemaIds: string[] = [];
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    for (let i = 1; i <= 10; i += 1) {
      const schemaId = ethers.utils.toUtf8Bytes(`schemaId-${i}`);
      const schemaRevision = ethers.utils.toUtf8Bytes(`schema-${i}`);
      // eslint-disable-next-line no-await-in-loop
      await ts.insertSchema(schemaId, schemaRevision, metadata);
      schemaIds.push(ethers.utils.hexlify(schemaId));
    }

    const result = await ts.getSchemaIds(1, 1);
    expect(result.items).to.deep.equal(schemaIds.slice(0, 1));
    expect(result.total).to.equal(10);
    expect(result.howMany).to.equal(1);
    expect(result.prev).to.equal(1);
    expect(result.next).to.equal(2);

    const result1 = await ts.getSchemaIds(3, 3);
    expect(result1.items).to.deep.equal(schemaIds.slice(6, 9));
    expect(result1.total).to.equal(10);
    expect(result1.howMany).to.equal(3);
    expect(result1.prev).to.equal(2);
    expect(result1.next).to.equal(4);

    const result2 = await ts.getSchemaIds(3, 10);
    expect(result2.items).to.have.length(0);
    expect(result2.total).to.equal(10);
    expect(result2.howMany).to.equal(0);
    expect(result2.prev).to.equal(1);
    expect(result2.next).to.equal(1);
  });

  it("getLatestSchemaRevision fails for missing parameter", async () => {
    await expect(ts.getLatestSchemaRevision([])).to.be.revertedWith(
      "schemaId empty",
    );
  });

  it("getLatestSchemaRevision fails for missing revision", async () => {
    await expect(
      ts.getLatestSchemaRevision(
        ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32),
      ),
    ).to.be.revertedWith("No revision");
  });

  it("getLatestSchemaRevision fails for unknown revision", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes(`schema`);
    await ts.insertSchema(schemaId, schemaRevision, metadata);
    const schemaId1 = ethers.utils.toUtf8Bytes("schemaId1");
    await expect(ts.getLatestSchemaRevision(schemaId1)).to.be.revertedWith(
      "No revision",
    );
  });

  it("getLatestSchemaRevision succeeds", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    for (let i = 1; i <= 3; i += 1) {
      const schemaRevision = ethers.utils.toUtf8Bytes(`schema-${i}`);
      const metadata = ethers.utils.toUtf8Bytes(`metadata-${i}`);
      if (i > 1) {
        // eslint-disable-next-line no-await-in-loop
        await ts.updateSchema(schemaId, schemaRevision, metadata);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await ts.insertSchema(schemaId, schemaRevision, metadata);
      }
    }
    const result = await ts.getLatestSchemaRevision(schemaId);
    expect(result).to.be.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`schema-3`)),
    );
  });

  it("getSchemaRevisionIds fails for empty schemaId", async () => {
    await expect(ts.getSchemaRevisionIds([], 1, 1)).to.be.revertedWith(
      "schemaId empty",
    );
  });

  it("getSchemaRevisionIds fails for invalid page and pageSize", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    await expect(ts.getSchemaRevisionIds(schemaId, 0, 1)).to.be.revertedWith(
      "Page must be > 0",
    );
    await expect(ts.getSchemaRevisionIds(schemaId, 1, 0)).to.be.revertedWith(
      "PageSize must be > 0",
    );
    await expect(ts.getSchemaRevisionIds(schemaId, 1, 51)).to.be.revertedWith(
      "PageSize must be <= 50",
    );
  });

  it("getSchemaRevisionIds succeeds", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const revisionsIds: string[] = [];
    for (let i = 1; i <= 10; i += 1) {
      const metadata = ethers.utils.toUtf8Bytes(`metadata-${i}`);
      const schemaRevision = ethers.utils.toUtf8Bytes(`schema-${i}`);
      if (i > 1) {
        // eslint-disable-next-line no-await-in-loop
        await ts.updateSchema(schemaId, schemaRevision, metadata);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await ts.insertSchema(schemaId, schemaRevision, metadata);
      }
      revisionsIds.push(ethers.utils.sha256(schemaRevision));
    }

    const r = await ts.getSchemaRevisionIds(schemaId, 1, 2);
    expect(r.items).to.deep.equal(revisionsIds.slice(0, 2));
    expect(r.howMany).to.equal(2);
    expect(r.total).to.equal(10);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(2);

    const r1 = await ts.getSchemaRevisionIds(schemaId, 3, 4);
    expect(r1.items).to.deep.equal(revisionsIds.slice(8, 10));
    expect(r1.howMany).to.equal(2);
    expect(r1.total).to.equal(10);
    expect(r1.prev).to.equal(2);
    expect(r1.next).to.equal(3);

    const r3 = await ts.getSchemaRevisionIds(schemaId, 3, 10);
    expect(r3.items).to.have.length(0);
    expect(r3.howMany).to.equal(0);
    expect(r3.total).to.equal(10);
    expect(r3.prev).to.equal(1);
    expect(r3.next).to.equal(1);
  });

  it("getSchemaRevision fails for empty parameter", async () => {
    await expect(
      ts.getSchemaRevision(ethers.constants.HashZero),
    ).to.be.revertedWith("SchemaRevisionId empty");
  });

  it("getSchemaRevision fails for missing revision", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await ts.insertSchema(schemaId, schemaRevision, metadata);
    const schemaRevision2 = ethers.utils.toUtf8Bytes("schema2");
    await expect(
      ts.getSchemaRevision(ethers.utils.sha256(schemaRevision2)),
    ).to.be.revertedWith("No revision");
  });

  it("getSchemaRevision succeeds", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await ts.insertSchema(schemaId, schemaRevision, metadata);

    const result = await ts.getSchemaRevision(
      ethers.utils.sha256(schemaRevision),
    );
    expect(result).to.be.equal(ethers.utils.hexlify(schemaRevision));
  });

  it("getLatestSchemaRevisionMetadataByRevisionId fails for empty parameter", async () => {
    await expect(
      ts.getLatestSchemaRevisionMetadataByRevisionId(ethers.constants.HashZero),
    ).to.be.revertedWith("SchemaRevisionId empty");
  });

  it("getLatestSchemaRevisionMetadataByRevisionId fails for unknown revisionId", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await ts.insertSchema(schemaId, schemaRevision, metadata);
    const schemaRevision2 = ethers.utils.toUtf8Bytes("schema2");
    await expect(
      ts.getLatestSchemaRevisionMetadataByRevisionId(
        ethers.utils.sha256(schemaRevision2),
      ),
    ).to.be.revertedWith("No metadata");
  });

  it("should fail when user does not have attribute updateMetadata", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision1 = ethers.utils.toUtf8Bytes("schema1");
    const schemaRevision2 = ethers.utils.toUtf8Bytes("schema2");
    await ts.insertSchema(schemaId, schemaRevision1, metadata);
    await policyContractMock.setPolicyResult(false);
    await expect(
      ts.updateMetadata(ethers.utils.sha256(schemaRevision2), metadata),
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TSR:updateMetadata",
    );
  });

  it("updateMetadata fails when register is not registered", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision1 = ethers.utils.toUtf8Bytes("schema1");
    const schemaRevision2 = ethers.utils.toUtf8Bytes("schema2");
    await ts.insertSchema(schemaId, schemaRevision1, metadata);
    await expect(
      ts.updateMetadata(ethers.utils.sha256(schemaRevision2), metadata),
    ).to.be.revertedWith("schema not registered");
  });

  it("updateMetadata fails for empty parameters", async () => {
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await expect(
      ts.updateMetadata(ethers.constants.HashZero, metadata),
    ).to.be.revertedWith("schemaRevisionId empty");
    await expect(
      ts.updateMetadata(ethers.utils.sha256(schemaRevision), []),
    ).to.be.revertedWith("metadata empty");
  });

  it("getLatestSchemaRevisionMetadataByRevisionId and updateMetadata succeed", async () => {
    const metadata1 = ethers.utils.toUtf8Bytes("metadata1");
    const metadata2 = ethers.utils.toUtf8Bytes("metadata2");
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await ts.insertSchema(schemaId, schemaRevision, metadata1);
    await ts.updateMetadata(ethers.utils.sha256(schemaRevision), metadata2);
    await expect(
      ts.updateMetadata(ethers.utils.sha256(schemaRevision), metadata2),
    ).to.be.revertedWith("Metadata exists");
    const metadata = await ts.getLatestSchemaRevisionMetadataByRevisionId(
      ethers.utils.sha256(schemaRevision),
    );
    expect(metadata).to.be.equal(ethers.utils.hexlify(metadata2));
  });

  it("updateSchema fails for empty params", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    await expect(ts.updateSchema([], [], [])).to.be.revertedWith(
      "schema empty",
    );
    await expect(ts.updateSchema(schemaId, [], [])).to.be.revertedWith(
      "revision empty",
    );
    await expect(
      ts.updateSchema(schemaId, schemaRevision, []),
    ).to.be.revertedWith("metadata empty");
  });

  it("updateSchema fails when schema not registered", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaId1 = ethers.utils.toUtf8Bytes("schemaId1");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const schemaRevision2 = ethers.utils.toUtf8Bytes("schema2");
    const metadata1 = ethers.utils.toUtf8Bytes("metadata1");
    await ts.insertSchema(schemaId, schemaRevision, metadata1);
    await expect(
      ts.updateSchema(schemaId1, schemaRevision2, metadata1),
    ).to.be.revertedWith("Schema not registered");
  });

  it("updateSchema fails when revision already registered", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const metadata1 = ethers.utils.toUtf8Bytes("metadata1");
    const metadata2 = ethers.utils.toUtf8Bytes("metadata2");
    await ts.insertSchema(schemaId, schemaRevision, metadata1);
    await expect(
      ts.updateSchema(schemaId, schemaRevision, metadata2),
    ).to.be.revertedWith("Revision exist");
  });

  it("updateSchema succeeds", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision1 = ethers.utils.toUtf8Bytes("schema1");
    const schemaRevision2 = ethers.utils.toUtf8Bytes("schema2");
    const schemaRevision3 = ethers.utils.toUtf8Bytes("schema3");
    const metadata1 = ethers.utils.toUtf8Bytes("metadata1");
    const metadata2 = ethers.utils.toUtf8Bytes("metadata2");
    await ts.insertSchema(schemaId, schemaRevision1, metadata1);
    await expect(ts.updateSchema(schemaId, schemaRevision2, metadata2))
      .to.emit(ts, "SchemaUpdated")
      .withArgs(
        ethers.utils.hexlify(schemaId),
        ethers.utils.hexlify(schemaRevision2),
        ethers.utils.hexlify(metadata2),
      );
    await expect(
      ts.updateSchema(schemaId, schemaRevision3, metadata2),
    ).to.be.revertedWith("Metadata exists");
    const updatedSchema = await ts.getSchemaRevision(
      ethers.utils.sha256(schemaRevision2),
    );
    expect(updatedSchema).to.equal(ethers.utils.hexlify(schemaRevision2));
  });

  it("getSchemaRevisionMetadataIds fails for empty schemaRevisionId", async () => {
    await expect(
      ts.getSchemaRevisionMetadataIds(ethers.constants.HashZero, 1, 1),
    ).to.be.revertedWith("SchemaRevisionId empty");
  });

  it("getSchemaRevisionMetadataIds fails for wrong page and pageSize values", async () => {
    const schemaRevisionId = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("schema"),
    );
    // page = 0 should revert
    await expect(
      ts.getSchemaRevisionMetadataIds(schemaRevisionId, 0, 1),
    ).to.be.revertedWith("Page must be > 0");

    // pagesize = 0 should revert
    await expect(
      ts.getSchemaRevisionMetadataIds(schemaRevisionId, 1, 0),
    ).to.be.revertedWith("PageSize must be > 0");

    // pagesize > 50 should revert
    await expect(
      ts.getSchemaRevisionMetadataIds(schemaRevisionId, 1, 51),
    ).to.be.revertedWith("PageSize must be <= 50");
  });

  it("getSchemaRevisionMetadataIds succeeds", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    const metadataIds: string[] = [];
    const schemaRevisionId = ethers.utils.sha256(schemaRevision);
    metadataIds.push(ethers.utils.sha256(metadata));

    await ts.insertSchema(schemaId, schemaRevision, metadata);

    for (let i = 1; i <= 10; i += 1) {
      const m = ethers.utils.toUtf8Bytes(`metadata+${i}`);
      // eslint-disable-next-line no-await-in-loop
      await ts.updateMetadata(schemaRevisionId, m);

      metadataIds.push(ethers.utils.sha256(m));
    }

    const r = await ts.getSchemaRevisionMetadataIds(schemaRevisionId, 1, 1);
    expect(r.items).to.deep.equal(metadataIds.slice(0, 1));
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(1);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(2);

    const r1 = await ts.getSchemaRevisionMetadataIds(schemaRevisionId, 3, 4);
    expect(r1.items).to.deep.equal(metadataIds.slice(8, 11));
    expect(r1.howMany).to.equal(3);
    expect(r1.total).to.equal(11);
    expect(r1.prev).to.equal(2);
    expect(r1.next).to.equal(3);

    const r3 = await ts.getSchemaRevisionMetadataIds(schemaRevisionId, 3, 10);
    expect(r3.items).to.have.length(0);
    expect(r3.howMany).to.equal(0);
    expect(r3.total).to.equal(11);
    expect(r3.prev).to.equal(2);
    expect(r3.next).to.equal(2);

    const schemaRevision1 = ethers.utils.toUtf8Bytes("schema1");
    const schemaRevisionId1 = ethers.utils.sha256(schemaRevision1);
    const r4 = await ts.getSchemaRevisionMetadataIds(schemaRevisionId1, 1, 1);
    expect(r4.items).to.have.length(0);
    expect(r4.howMany).to.equal(0);
    expect(r4.total).to.equal(0);
  });

  it("getSchemaRevisionMetadataByMetadataId fails for empty metadataId", async () => {
    await expect(
      ts.getSchemaRevisionMetadataByMetadataId(ethers.constants.HashZero),
    ).to.be.revertedWith("MetadataId empty");
  });

  it("getSchemaRevisionMetadataByMetadataId fails unknown metadataId", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const metadata1 = ethers.utils.toUtf8Bytes("metadata1");
    const metadata2 = ethers.utils.toUtf8Bytes("metadata2");
    await ts.insertSchema(schemaId, schemaRevision, metadata1);
    await expect(
      ts.getSchemaRevisionMetadataByMetadataId(ethers.utils.sha256(metadata2)),
    ).to.be.revertedWith("No metadata");
  });

  it("getSchemaRevisionMetadataByMetadataId succeeds", async () => {
    const schemaId = ethers.utils.toUtf8Bytes("schemaId");
    const schemaRevision = ethers.utils.toUtf8Bytes("schema");
    const metadata = ethers.utils.toUtf8Bytes("metadata");
    await ts.insertSchema(schemaId, schemaRevision, metadata);
    const r = await ts.getSchemaRevisionMetadataByMetadataId(
      ethers.utils.sha256(metadata),
    );
    expect(r).to.equal(ethers.utils.hexlify(metadata));
  });
});
