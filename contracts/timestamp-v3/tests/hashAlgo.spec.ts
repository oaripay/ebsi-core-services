import StringManipArtifact from "@ebsiint-sc/bootstrap-v2/artifacts/contracts/utils/StringManip.sol/StringManip.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network, upgrades, waffle } from "hardhat";

import type { PolicyRegistryMock, Timestamp } from "../src/types";

import { testTprAddress } from "./testAddress";

const { deployContract } = waffle;

describe("Hash Algorithm", () => {
  let ts: Timestamp;
  let admin: SignerWithAddress;
  let policyContractMock: PolicyRegistryMock;

  before(async () => {
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
  });

  beforeEach(async () => {
    [admin] = await ethers.getSigners();
    const stringManipLib = await deployContract(admin, StringManipArtifact, []);

    const haFactory = await ethers.getContractFactory("HashAlgoLib", {});
    const haLib = await haFactory.deploy();

    const tsFactory = await ethers.getContractFactory("TimestampLib", {});
    const tsLib = await tsFactory.deploy();

    const rsFactory = await ethers.getContractFactory("RecordLib", {
      libraries: {
        StringManip: stringManipLib.address,
      },
    });
    const rsLib = await rsFactory.deploy();

    const contractFactory = await ethers.getContractFactory("Timestamp", {
      libraries: {
        HashAlgoLib: haLib.address,
        RecordLib: rsLib.address,
        TimestampLib: tsLib.address,
      },
    });

    ts = (await upgrades.deployProxy(
      contractFactory,
      [admin.address, testTprAddress],
      { unsafeAllowLinkedLibraries: true },
    )) as Timestamp;

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.properAddress;
    await policyContractMock.setPolicyResult(true);
  });

  it("should fail when user does not have attribute insertHashAlgorithm", async () => {
    await policyContractMock.setPolicyResult(false);
    await expect(
      ts.insertHashAlgorithm(256, "SHA2-256", "oid2256", 1, "multi256"),
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TS:insertHashAlgorithm",
    );
  });

  it("should fail when user does not have attribute updateHashAlgorithm", async () => {
    await policyContractMock.setPolicyResult(false);
    await expect(
      ts.updateHashAlgorithm(0, 1, "sha-256", "oid", 1, "sha2-256"),
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TS:updateHashAlgorithm",
    );
  });

  it("getHashAlgorithmById should succeed", async () => {
    await expect(
      ts.insertHashAlgorithm(256, "SHA256", "oid256", 1, "multi"),
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(0);
    expect(receipt.outputLength).to.equal(256);
    expect(receipt.ianaName).to.equal("SHA256");
    expect(receipt.oid).to.equal("oid256");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("multi");

    await ts.insertHashAlgorithm(256, "SHA2-256", "oid2256", 1, "multi256");
    await ts.insertHashAlgorithm(512, "SHA512", "oid2", 1, "multi512");
    await ts.insertHashAlgorithm(256, "SHA3-256", "oid3", 1, "multi2-256");
    const receipt2 = await ts.getHashAlgorithmById(2);
    expect(receipt2.outputLength).to.equal(512);
    expect(receipt2.ianaName).to.equal("SHA512");
    expect(receipt2.oid).to.equal("oid2");
    expect(receipt2.status).to.equal(1);
    expect(receipt2.multiHash).to.equal("multi512");
    const receipt3 = await ts.getHashAlgorithmById(3);
    expect(receipt3.outputLength).to.equal(256);
    expect(receipt3.ianaName).to.equal("SHA3-256");
    expect(receipt3.oid).to.equal("oid3");
    expect(receipt3.status).to.equal(1);
    expect(receipt3.multiHash).to.equal("multi2-256");
  });

  it("getHashAlgorithmById should revert if hash is unknown", async () => {
    await expect(ts.getHashAlgorithmById(0)).to.be.revertedWith(
      "hashAlgo unknown",
    );
  });

  it("insertHashAlgorithm should revert for incorrect parameters", async () => {
    await expect(
      ts.connect(admin).insertHashAlgorithm(0, "SHA256", "oid", 1, ""),
    ).to.be.revertedWith("outputLength==0");

    await ts.connect(admin).insertHashAlgorithm(256, "SHA256", "oid", 1, "");
    await expect(
      ts.connect(admin).insertHashAlgorithm(256, "SHA256", "oid", 1, ""),
    ).to.be.revertedWith("ianaName defined");

    await expect(
      ts.insertHashAlgorithm(1, "SHA256", "oid", 0, ""),
    ).to.be.revertedWith("status==0");

    await expect(
      ts.insertHashAlgorithm(256, "", "oid", 1, ""),
    ).to.be.revertedWith("ianaName unknown");
  });

  it("insertHashAlgorithm should work", async () => {
    await expect(
      ts.connect(admin).insertHashAlgorithm(256, "SHA256", "oid", 1, ""),
    )
      .to.emit(ts, "AddNewHashAlgo")
      .withArgs(0, "SHA256", 256, "oid", 1, "");
    await expect(
      ts.connect(admin).insertHashAlgorithm(512, "SHA3-512", "oid2", 1, "tt"),
    )
      .to.emit(ts, "AddNewHashAlgo")
      .withArgs(1, "SHA3-512", 512, "oid2", 1, "tt");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("tt");
  });

  it("updateHashAlgorithm should revert for incorrect parameters", async () => {
    await expect(
      ts.updateHashAlgorithm(0, 0, "SHA256", "oid", 1, ""),
    ).to.be.revertedWith("outputLength==0");
    await expect(
      ts.updateHashAlgorithm(0, 1, "SHA256", "oid", 0, ""),
    ).to.be.revertedWith("status==0");
    await expect(
      ts.updateHashAlgorithm(0, 1, "SHA256", "oid", 1, ""),
    ).to.be.revertedWith("hashAlgorithmId unknown");
  });

  it("updateHashAlgorithm should revert for empty ianaName", async () => {
    await expect(ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo",
    );
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, ""),
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("");

    await expect(
      ts.updateHashAlgorithm(1, 1024, "", "oid3", 2, ""),
    ).to.be.revertedWith("ianaName unknown");
  });

  it("updateHashAlgorithm should update also ianaName", async () => {
    await expect(ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo",
    );
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, ""),
    ).to.emit(ts, "AddNewHashAlgo");
    let receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("");
    await ts.updateHashAlgorithm(1, 1024, "SHA3-512", "oid3", 2, "");
    receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(1024);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid3");
    expect(receipt.status).to.equal(2);
    expect(receipt.multiHash).to.equal("");
    await ts.updateHashAlgorithm(1, 1024, "SHA4-512", "oid3", 2, "");
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, ""),
    ).to.emit(ts, "AddNewHashAlgo");
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, ""),
    ).to.be.revertedWith("ianaName defined");
    await expect(
      ts.insertHashAlgorithm(512, "SHA4-512", "oid2", 1, ""),
    ).to.be.revertedWith("ianaName defined");
  });

  it("updateHashAlgorithm should work", async () => {
    await expect(ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo",
    );
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, ""),
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("");

    await expect(ts.updateHashAlgorithm(1, 1024, "SHA4-1024", "oid3", 2, ""))
      .to.emit(ts, "UpdateHashAlgo")
      .withArgs(1, "SHA4-1024", 1024, "oid3", 2, "");
    const updated = await ts.getHashAlgorithmById(1);
    expect(updated.outputLength).to.equal(1024);
    expect(updated.ianaName).to.equal("SHA4-1024");
    expect(updated.oid).to.equal("oid3");
    expect(updated.status).to.equal(2);
    expect(updated.multiHash).to.equal("");
  });
});
