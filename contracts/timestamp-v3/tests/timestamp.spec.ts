import StringManipArtifact from "@ebsiint-sc/bootstrap-v2/artifacts/contracts/utils/StringManip.sol/StringManip.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers, network, upgrades, waffle } from "hardhat";

import type { PolicyRegistryMock, Timestamp } from "../src/types";

import { testTprAddress } from "./testAddress";

const { deployContract } = waffle;

describe("Timestamp Hashes", () => {
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
    await ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "");
    await ts.insertHashAlgorithm(512, "SHA512", "oid2", 1, "");
    await ts.insertHashAlgorithm(256, "SHA3-256", "oid3", 1, "");
  });

  it("getTimestamp should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.timestampHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
    );
    const r1 = await ts.getTimestamp(hash1);
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(r1.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("btc")),
    );
    expect(r1.blockNumber).to.equal(blockNumber + 1);
    const r3 = await ts.getTimestamp(hash3);
    expect(r3.hash.value).to.equal(ethers.utils.hexlify(hash3));
    expect(r3.hash.algorithm).to.equal(2);
    expect(r3.timestampedBy).to.equal(admin.address);
    expect(r3.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("ath")),
    );
    expect(r3.blockNumber).to.equal(blockNumber + 1);
  });

  it("getTimestamp should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.timestampHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [[], ethers.utils.toUtf8Bytes("new"), []],
    );
    const r1 = await ts.getTimestamp(hash1);
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(ethers.utils.hexlify(r1.data)).to.equal(ethers.utils.hexlify([]));
    expect(r1.blockNumber).to.equal(blockNumber + 1);
    const r2 = await ts.getTimestamp(hash2);
    expect(r2.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("new")),
    );
    const r3 = await ts.getTimestamp(hash3);
    expect(r3.hash.value).to.equal(ethers.utils.hexlify(hash3));
    expect(r3.hash.algorithm).to.equal(2);
    expect(r3.timestampedBy).to.equal(admin.address);
    expect(ethers.utils.hexlify(r3.data)).to.equal(ethers.utils.hexlify([]));
    expect(r3.blockNumber).to.equal(blockNumber + 1);
  });

  it("getTimestamp should revert if hash is unknown", async () => {
    await expect(
      ts.getTimestamp(ethers.utils.toUtf8Bytes("unknow?")),
    ).to.be.revertedWith("timestamp unknown");
  });

  it("getTimestamp should revert if hash is empty", async () => {
    await expect(ts.getTimestamp([])).to.be.revertedWith("hash empty");
  });

  it("getTimestampById should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.timestampHashes([0, 1, 2], [hash1, hash2, hash3], []);
    const r1 = await ts.getTimestampById(ethers.utils.sha256(hash1));
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(ethers.utils.hexlify(r1.data)).to.equal(ethers.utils.hexlify([]));
    expect(r1.blockNumber).to.equal(blockNumber + 1);

    const r3 = await ts.getTimestampById(ethers.utils.sha256(hash3));
    expect(r3.hash.value).to.equal(ethers.utils.hexlify(hash3));
    expect(r3.hash.algorithm).to.equal(2);
    expect(r3.timestampedBy).to.equal(admin.address);
    expect(ethers.utils.hexlify(r3.data)).to.equal(ethers.utils.hexlify([]));
    expect(r3.blockNumber).to.equal(blockNumber + 1);
  });

  it("getTimestampById should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const blockNumber = await ethers.provider.getBlockNumber();
    await ts.timestampHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
    );
    const r1 = await ts.getTimestampById(ethers.utils.sha256(hash1));
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(r1.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("btc")),
    );
    expect(r1.blockNumber).to.equal(blockNumber + 1);
    const r3 = await ts.getTimestampById(ethers.utils.sha256(hash3));
    expect(r3.hash.value).to.equal(ethers.utils.hexlify(hash3));
    expect(r3.hash.algorithm).to.equal(2);
    expect(r3.timestampedBy).to.equal(admin.address);
    expect(r3.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("ath")),
    );
    expect(r3.blockNumber).to.equal(blockNumber + 1);
  });

  it("getTimestampById should revert if timestampID is unknown", async () => {
    await expect(
      ts.getTimestampById(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("unknow?")),
      ),
    ).to.be.revertedWith("timestamp unknown");
  });

  it("getTimestgetTimestampByIdamp should revert if timestampId is empty", async () => {
    await expect(
      ts.getTimestampById(ethers.constants.HashZero),
    ).to.be.revertedWith("tsId empty");
  });

  it("timestampHashes should failed if > 3", async () => {
    await expect(
      ts.timestampHashes(
        [0, 1, 2, 3],
        [
          ethers.utils.toUtf8Bytes(
            "e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e12",
          ),
          ethers.utils.toUtf8Bytes(
            "aa54def9e0bb11c1ebbfc97a9ee63af9e95c4f54db29815daa1c0fe991d9d20c",
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6",
          ),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
      ),
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampHashes(
        [0, 1, 2],
        [
          ethers.utils.toUtf8Bytes(
            "e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e12",
          ),
          ethers.utils.toUtf8Bytes(
            "aa54def9e0bb11c1ebbfc97a9ee63af9e95c4fdf1d032b1da1c09d20c",
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6",
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6",
          ),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
      ),
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampHashes(
        [0, 1, 2],
        [
          ethers.utils.toUtf8Bytes(
            "e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e12",
          ),
          ethers.utils.toUtf8Bytes(
            "aa54def9e0bb11c1ebbfc97a9ee63af9e95c1ddae54eff0c4c28cd9d20c",
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6",
          ),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
      ),
    ).to.be.revertedWith("timestampData>3");
  });

  it("timestampHashes should failed for unknown hash algo", async () => {
    await expect(
      ts.timestampHashes(
        [7, 1, 2],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          ethers.utils.toUtf8Bytes("aa54defe54eff0c4c28"),
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
      ),
    ).to.be.revertedWith("hashAlgo unknown");
  });

  it("timestampHashes should failed for empty value and hash", async () => {
    await expect(ts.insertHashAlgorithm(256, "SHA2561", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo",
    );
    await expect(ts.insertHashAlgorithm(512, "SHA5122", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo",
    );
    await expect(
      ts.insertHashAlgorithm(256, "SHA3-2563", "oid", 1, ""),
    ).to.emit(ts, "AddNewHashAlgo");
    await expect(
      ts.timestampHashes(
        [5, 3, 1],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
      ),
    ).to.be.revertedWith("hashValue empty");
    // should not revert
    await ts.timestampHashes(
      [5, 1, 2],
      [
        ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
        ethers.utils.toUtf8Bytes("aa54def9"),
        ethers.utils.toUtf8Bytes("38862f7ef56079768"),
      ],
      [],
    );
  });

  it("timestampHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await expect(
      ts.timestampHashes(
        [0, 1, 2],
        [hash1, hash2, hash3],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
      ),
    ).to.emit(ts, "TimestampedHashes");
  });

  it("timestampHashes should succeed even with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await expect(
      ts.timestampHashes([0, 1, 2], [hash1, hash2, hash3], []),
    ).to.emit(ts, "TimestampedHashes");
  });
});
