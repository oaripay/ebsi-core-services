import { ethers, waffle, network } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import StringManipArtifact from "@ebsiint-sc/bootstrap/artifacts/contracts/utils/StringManip.sol/StringManip.json";
import { testTprAddress } from "./testAddress";

const { deployContract } = waffle;

describe("Timestamp Hashes", () => {
  let ts: Contract;
  let admin: SignerWithAddress;
  let policyContractMock: Contract;

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
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
        TimestampLib: tsLib.address,
        RecordLib: rsLib.address,
      },
    });
    ts = await contractFactory.deploy(testTprAddress);

    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
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
      ]
    );
    const r1 = await ts.getTimestamp(hash1);
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(r1.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("btc"))
    );
    expect(r1.blockNumber).to.equal(blockNumber + 1);
    const r3 = await ts.getTimestamp(hash3);
    expect(r3.hash.value).to.equal(ethers.utils.hexlify(hash3));
    expect(r3.hash.algorithm).to.equal(2);
    expect(r3.timestampedBy).to.equal(admin.address);
    expect(r3.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("ath"))
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
      [[], ethers.utils.toUtf8Bytes("new"), []]
    );
    const r1 = await ts.getTimestamp(hash1);
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(ethers.utils.hexlify(r1.data)).to.equal(ethers.utils.hexlify([]));
    expect(r1.blockNumber).to.equal(blockNumber + 1);
    const r2 = await ts.getTimestamp(hash2);
    expect(r2.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("new"))
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
      ts.getTimestamp(ethers.utils.toUtf8Bytes("unknow?"))
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
      ]
    );
    const r1 = await ts.getTimestampById(ethers.utils.sha256(hash1));
    expect(r1.hash.value).to.equal(ethers.utils.hexlify(hash1));
    expect(r1.hash.algorithm).to.equal(0);
    expect(r1.timestampedBy).to.equal(admin.address);
    expect(r1.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("btc"))
    );
    expect(r1.blockNumber).to.equal(blockNumber + 1);
    const r3 = await ts.getTimestampById(ethers.utils.sha256(hash3));
    expect(r3.hash.value).to.equal(ethers.utils.hexlify(hash3));
    expect(r3.hash.algorithm).to.equal(2);
    expect(r3.timestampedBy).to.equal(admin.address);
    expect(r3.data).to.equal(
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes("ath"))
    );
    expect(r3.blockNumber).to.equal(blockNumber + 1);
  });

  it("getTimestampById should revert if timestampID is unknown", async () => {
    await expect(
      ts.getTimestampById(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("unknow?"))
      )
    ).to.be.revertedWith("timestamp unknown");
  });

  it("getTimestgetTimestampByIdamp should revert if timestampId is empty", async () => {
    await expect(
      ts.getTimestampById(ethers.constants.HashZero)
    ).to.be.revertedWith("tsId empty");
  });

  it("timestampHashes should fail if > 3", async () => {
    await expect(
      ts.timestampHashes(
        [0, 1, 2, 3],
        [
          ethers.utils.toUtf8Bytes(
            "e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e12"
          ),
          ethers.utils.toUtf8Bytes(
            "aa54def9e0bb11c1ebbfc97a9ee63af9e95c4f54db29815daa1c0fe991d9d20c"
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6"
          ),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ]
      )
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampHashes(
        [0, 1, 2],
        [
          ethers.utils.toUtf8Bytes(
            "e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e12"
          ),
          ethers.utils.toUtf8Bytes(
            "aa54def9e0bb11c1ebbfc97a9ee63af9e95c4fdf1d032b1da1c09d20c"
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6"
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6"
          ),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ]
      )
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampHashes(
        [0, 1, 2],
        [
          ethers.utils.toUtf8Bytes(
            "e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e12"
          ),
          ethers.utils.toUtf8Bytes(
            "aa54def9e0bb11c1ebbfc97a9ee63af9e95c1ddae54eff0c4c28cd9d20c"
          ),
          ethers.utils.toUtf8Bytes(
            "38862f7ef560797680273f23ab1974285c3c07bba979a3e92e931bfbe362bcc6"
          ),
        ],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
          ethers.utils.toUtf8Bytes("ath"),
        ]
      )
    ).to.be.revertedWith("timestampData>3");
  });

  it("timestampHashes should fail for unknown hash algo", async () => {
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
        ]
      )
    ).to.be.revertedWith("hashAlgo unknown");
  });

  it("timestampHashes should fail for empty value and hash", async () => {
    await expect(ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo"
    );
    await expect(ts.insertHashAlgorithm(512, "SHA512", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo"
    );
    await expect(ts.insertHashAlgorithm(256, "SHA3-256", "oid", 1, "")).to.emit(
      ts,
      "AddNewHashAlgo"
    );
    await ts.getHashAlgorithms(1, 10);
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
        ]
      )
    ).to.be.revertedWith("hashValue empty");
    // should not revert
    await ts.timestampHashes(
      [5, 1, 2],
      [
        ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
        ethers.utils.toUtf8Bytes("aa54def9"),
        ethers.utils.toUtf8Bytes("38862f7ef56079768"),
      ],
      []
    );
  });

  it("timestampHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await ts.timestampHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ]
    );

    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);
  });

  it("timestampHashes should succeed even with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await ts.timestampHashes([0, 1, 2], [hash1, hash2, hash3], []);

    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);
  });

  it("getTimestamps should fail with wrong page and pageSize", async () => {
    const resTsIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const data = `SHA-${i}`;
      const hash = `e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e1${i}`;
      // Id starts from zero
      resTsIds.push(ethers.utils.sha256(ethers.utils.toUtf8Bytes(hash)));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.timestampHashes(
          [0],
          [ethers.utils.toUtf8Bytes(hash)],
          [ethers.utils.toUtf8Bytes(data)]
        )
      );
    }
    // pagesize = 0 should revert
    await expect(ts.getTimestamps(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getTimestamps(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getTimestamps(1, 51)).to.be.revertedWith("PSize not <= 50");
  });

  it("getTimestamps should succeed", async () => {
    const resTsIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const data = `SHA-${i}`;
      const hash = `e40605e6a26268a5eb83c155ea5dd12aeb3314f6ba5d67d4b607de95156e4e1${i}`;
      // Id starts from zero
      resTsIds.push(ethers.utils.sha256(ethers.utils.toUtf8Bytes(hash)));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.timestampHashes(
          [0],
          [ethers.utils.toUtf8Bytes(hash)],
          [ethers.utils.toUtf8Bytes(data)]
        )
      );
    }

    const r0 = await ts.getTimestamps(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resTsIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getTimestamps(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resTsIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getTimestamps(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
