import { ethers, network } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";
import { DidRegistry } from "../src/types";
import { testTprAddress } from "./testAddress";

describe("Hash Algorithm", () => {
  let ts: DidRegistry;
  let policyContractMock: Contract;

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
  });

  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();
    const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
    const hashAlgoLib = await hashAlgoFactory.deploy();

    const didTimestampFactory = await ethers.getContractFactory(
      "DidTimestampLib"
    );
    const didTimestampLib = await didTimestampFactory.deploy();

    const didRecordFactory = await ethers.getContractFactory("DidRecordLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const didRecordLib = await didRecordFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        HashAlgoLib: hashAlgoLib.address,
        DidTimestampLib: didTimestampLib.address,
        DidRecordLib: didRecordLib.address,
      },
    });
    ts = (await contractFactory.deploy(testTprAddress)) as DidRegistry;
    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.properAddress;
  });

  it("should reject no authenticated users", async () => {
    await policyContractMock.setPolicyResult(false);
    await expect(
      ts.insertHashAlgorithm(256, "sha-256", "oid256", 1, "sha2-256")
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute DIDR:insertHashAlgorithm"
    );

    await expect(
      ts.updateHashAlgorithm(0, 1, "sha-256", "oid", 1, "sha2-256")
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute DIDR:updateHashAlgorithm"
    );
  });

  it("getHashAlgorithmById should succeed", async () => {
    await policyContractMock.setPolicyResult(true);
    await expect(
      ts.insertHashAlgorithm(256, "sha-256", "oid256", 1, "sha2-256")
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(0);
    expect(receipt.outputLength).to.equal(256);
    expect(receipt.ianaName).to.equal("sha-256");
    expect(receipt.oid).to.equal("oid256");
    expect(receipt.status).to.equal(1);
    expect(receipt.multihash).to.equal("sha2-256");

    await ts.insertHashAlgorithm(256, "SHA2-256", "oid2256", 1, "sha2-256");
    await ts.insertHashAlgorithm(512, "sha-512", "oid2", 1, "sha2-512");
    await ts.insertHashAlgorithm(256, "sha3-256", "oid3", 1, "sha3-256");
    const receipt2 = await ts.getHashAlgorithmById(2);
    expect(receipt2.outputLength).to.equal(512);
    expect(receipt2.ianaName).to.equal("sha-512");
    expect(receipt2.oid).to.equal("oid2");
    expect(receipt2.status).to.equal(1);
    expect(receipt2.multihash).to.equal("sha2-512");
    const receipt3 = await ts.getHashAlgorithmById(3);
    expect(receipt3.outputLength).to.equal(256);
    expect(receipt3.ianaName).to.equal("sha3-256");
    expect(receipt3.oid).to.equal("oid3");
    expect(receipt3.status).to.equal(1);
    expect(receipt3.multihash).to.equal("sha3-256");
  });

  it("getHashAlgorithmById should revert if hash is unknown", async () => {
    await policyContractMock.setPolicyResult(true);
    await expect(ts.getHashAlgorithmById(0)).to.be.revertedWith(
      "hashAlgo unknown"
    );
  });

  it("insertHashAlgorithm should work", async () => {
    await policyContractMock.setPolicyResult(true);
    await expect(ts.insertHashAlgorithm(256, "sha-256", "oid", 1, "sha2-256"))
      .to.emit(ts, "AddNewHashAlgo")
      .withArgs(0, "sha-256", "sha-256", 256, "oid", 1, "sha2-256");
    await expect(ts.insertHashAlgorithm(512, "sha3-512", "oid2", 1, "sha3-512"))
      .to.emit(ts, "AddNewHashAlgo")
      .withArgs(1, "sha3-512", "sha3-512", 512, "oid2", 1, "sha3-512");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("sha3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multihash).to.equal("sha3-512");
  });

  it("updateHashAlgorithm should revert for incorrect parameters", async () => {
    await policyContractMock.setPolicyResult(true);
    await expect(
      ts.updateHashAlgorithm(0, 0, "sha-256", "oid", 1, "sha2-256")
    ).to.be.revertedWith("outputLength==0");
    await expect(
      ts.updateHashAlgorithm(0, 1, "sha-256", "oid", 0, "sha2-256")
    ).to.be.revertedWith("status==0");
    await expect(
      ts.updateHashAlgorithm(0, 1, "sha-256", "oid", 1, "sha2-256")
    ).to.be.revertedWith("hashAlgorithmId unknown");
  });

  it("updateHashAlgorithm should work", async () => {
    await policyContractMock.setPolicyResult(true);
    await expect(
      ts.insertHashAlgorithm(256, "sha-256", "oid", 1, "sha2-256")
    ).to.emit(ts, "AddNewHashAlgo");
    await expect(
      ts.insertHashAlgorithm(512, "sha3-512", "oid2", 1, "sha3-512")
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("sha3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multihash).to.equal("sha3-512");

    await expect(
      ts.updateHashAlgorithm(1, 384, "sha3-384", "oid3", 2, "sha3-384")
    )
      .to.emit(ts, "UpdateHashAlgo")
      .withArgs(1, "sha3-384", "sha3-384", 384, "oid3", 2, "sha3-384");
    const updated = await ts.getHashAlgorithmById(1);
    expect(updated.outputLength).to.equal(384);
    expect(updated.ianaName).to.equal("sha3-384");
    expect(updated.oid).to.equal("oid3");
    expect(updated.status).to.equal(2);
    expect(updated.multihash).to.equal("sha3-384");
  });

  it("getHashAlgorithms should fail with wrong page and pageSize", async () => {
    const resHashIds: number[] = [];
    for (let i = 1; i < 12; i += 1) {
      const name = `SHA-${i}`;
      const oid = `oid${i}`;
      const multihash = `multihash${i}`;
      // Id starts from zero
      resHashIds.push(i - 1);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(ts.insertHashAlgorithm(i, name, oid, 1, multihash)).to.emit(
        ts,
        "AddNewHashAlgo"
      );
    }
    // pagesize = 0 should revert
    await expect(ts.getHashAlgorithms(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getHashAlgorithms(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getHashAlgorithms(1, 51)).to.be.revertedWith(
      "PSize not <=50"
    );
  });

  it("getHashAlgorithms should work with correct page and pageSize", async () => {
    const resHashIds: number[] = [];
    for (let i = 1; i < 12; i += 1) {
      const name = `SHA-${i}`;
      const oid = `oid${i}`;
      const multihash = `multihash${i}`;

      // Id starts from zero
      resHashIds.push(i - 1);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(ts.insertHashAlgorithm(i, name, oid, 1, multihash)).to.emit(
        ts,
        "AddNewHashAlgo"
      );
    }

    const r0 = await ts.getHashAlgorithms(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resHashIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getHashAlgorithms(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resHashIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getHashAlgorithms(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
