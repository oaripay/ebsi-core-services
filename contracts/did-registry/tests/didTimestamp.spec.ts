import { ethers, network } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import type { DidRegistry } from "../src/types";
import { testTprAddress } from "./testAddress";

describe("Timestamp Hashes", () => {
  let ts: DidRegistry;
  let user: SignerWithAddress;

  before(async () => {
    [, user] = await ethers.getSigners();
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    const policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);
  });

  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();
    const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
    const hashAlgoLib = await hashAlgoFactory.deploy();

    const didTimestampFactory =
      await ethers.getContractFactory("DidTimestampLib");
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

    ts = await contractFactory.deploy(testTprAddress);

    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    // 3
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.be.properAddress;

    // add hashAlgo
    await ts.insertHashAlgorithm(256, "sha-256", "oid", 1, "sha2-256");
    await ts.insertHashAlgorithm(512, "sha-512", "oid2", 1, "sha2-512");
    await ts.insertHashAlgorithm(256, "sha3-256", "oid3", 1, "sha3-256");

    ts = ts.connect(user);
  });

  it("getDidTimestamp should succeed", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.didTimestampHash(0, hash1, ethers.utils.toUtf8Bytes("btc"));
    const r1 = await ts.getDidTimestamp(hash1);
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(user.address);
    expect(r1.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("btc")),
    );
    expect(r1.blockNumber).to.equal(blockNumber + 1);
  });

  it("getTimestamp should succeed with empty data", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.didTimestampHash(0, hash1, []);
    const r1 = await ts.getDidTimestamp(hash1);
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(user.address);
    expect(ethers.utils.hexlify(r1.data)).to.equal(ethers.utils.hexlify([]));
    expect(r1.blockNumber).to.equal(blockNumber + 1);
  });

  it("getDidTimestamp should revert if hash is unknown", async () => {
    await expect(
      ts.getDidTimestamp(ethers.utils.toUtf8Bytes("unknow?")),
    ).to.be.revertedWith("timestamp unknown");
  });

  it("getDidTimestamp should revert if hash is empty", async () => {
    await expect(ts.getDidTimestamp([])).to.be.revertedWith("hash empty");
  });

  it("getDidTimestampById should succeed with empty data", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.didTimestampHash(0, hash1, []);
    const r1 = await ts.getDidTimestampById(ethers.utils.sha256(hash1));
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(user.address);
    expect(ethers.utils.hexlify(r1.data)).to.equal(ethers.utils.hexlify([]));
    expect(r1.blockNumber).to.equal(blockNumber + 1);
  });

  it("getDidTimestampById should succeed", async () => {
    const hash0 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const hash1 = `${hash0}${hash0.substring(2)}`;
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.didTimestampHash(1, hash1, ethers.utils.toUtf8Bytes("btc"));
    const r1 = await ts.getDidTimestampById(ethers.utils.sha256(hash1));
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(1);
    expect(r1.timestampedBy).to.equal(user.address);
    expect(r1.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("btc")),
    );
    expect(r1.blockNumber).to.equal(blockNumber + 1);
  });

  it("getDidTimestampById should revert if timestampID is unknown", async () => {
    await expect(
      ts.getDidTimestampById(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("unknow?")),
      ),
    ).to.be.revertedWith("timestamp unknown");
  });

  it("getDidTimestampById should revert if timestampId is empty", async () => {
    await expect(
      ts.getDidTimestampById(ethers.constants.HashZero),
    ).to.be.revertedWith("tsId empty");
  });

  it("didTimestampHash should fail for hash length mismatch", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    await expect(
      ts.didTimestampHash(1, hash1, ethers.utils.toUtf8Bytes("ath")),
    ).to.be.revertedWith("invalid hash length");
  });

  it("didTimestampHash should fail if > 3", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    await expect(
      ts.didTimestampHash(78, hash1, ethers.utils.toUtf8Bytes("ath")),
    ).to.be.revertedWith("hashAlgo unknown");
    await expect(
      ts.didTimestampHash(1, [], ethers.utils.toUtf8Bytes("ath")),
    ).to.be.revertedWith("hashValue empty");
  });

  it("didTimestampHash should fail for empty value and hash", async () => {
    await expect(
      ts.insertHashAlgorithm(256, "sha-256", "oid", 1, "sha2-256"),
    ).to.emit(ts, "AddNewHashAlgo");
    await expect(
      ts.insertHashAlgorithm(512, "sha-512", "oid2", 1, "sha2-512"),
    ).to.emit(ts, "AddNewHashAlgo");
    await expect(
      ts.insertHashAlgorithm(256, "sha3-256", "oid3", 1, "sha3-256"),
    ).to.emit(ts, "AddNewHashAlgo");

    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    await expect(
      ts.didTimestampHash(5, [], ethers.utils.toUtf8Bytes("ath")),
    ).to.be.revertedWith("hashValue empty");
    // should not revert
    await ts.didTimestampHash(5, hash1, []);
  });

  it("didTimestampHash should succeed", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));

    await expect(
      ts.didTimestampHash(0, hash1, ethers.utils.toUtf8Bytes("btc")),
    ).to.emit(ts, "DidTimestampedHash");

    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([ethers.utils.sha256(hash1)]);
  });

  it("didTimestampHash should succeed even with empty data", async () => {
    const hash1 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));

    await ts.didTimestampHash(0, hash1, []);

    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([ethers.utils.sha256(hash1)]);
  });

  it("getDidTimestamps should fail with wrong page and pageSize", async () => {
    const resTsIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const data = `SHA-${i}`;
      const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`${i}`));
      // Id starts from zero
      resTsIds.push(ethers.utils.sha256(hash));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.didTimestampHash(0, hash, ethers.utils.toUtf8Bytes(data)),
      );
    }
    // pagesize = 0 should revert
    await expect(ts.getDidTimestamps(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getDidTimestamps(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getDidTimestamps(1, 51)).to.be.revertedWith(
      "PSize not <= 50",
    );
  });

  it("getDidTimestamps should succeed", async () => {
    const resTsIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const data = `SHA-${i}`;
      const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`${i}`));

      // Id starts from zero
      resTsIds.push(ethers.utils.sha256(hash));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.didTimestampHash(0, hash, ethers.utils.toUtf8Bytes(data)),
      );
    }

    const r0 = await ts.getDidTimestamps(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resTsIds[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidTimestamps(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resTsIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidTimestamps(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
