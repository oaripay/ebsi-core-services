import { ethers, network, upgrades } from "hardhat";
import crypto from "node:crypto";
import { Contract } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import StringManipArtifact from "@ebsiint-sc/bootstrap-v2/artifacts/contracts/utils/StringManip.sol/StringManip.json";

import { testTprAddress } from "./testAddress";

const { deployContract } = waffle;

const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

const randomHash = () => `0x${crypto.randomBytes(32).toString("hex")}`;

describe("Record Hashes", () => {
  let ts: Contract;
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let policyContractMock: Contract;

  before(async () => {
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
  });

  beforeEach(async () => {
    [admin, user] = await ethers.getSigners();
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
    ts = await upgrades.deployProxy(
      contractFactory,
      [admin.address, testTprAddress],
      { unsafeAllowLinkedLibraries: true },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.be.properAddress;
    await policyContractMock.setPolicyResult(true);
    await ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "");
    await ts.insertHashAlgorithm(512, "SHA512", "oid2", 1, "");
    await ts.insertHashAlgorithm(256, "SHA3-256", "oid3", 1, "");
  });
  it("timestampVersionHashes should failed if > 3", async () => {
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("timestampData>3");
  });
  it("timestampVersionHashes should failed for unknown hash algo", async () => {
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashAlgo unknown");
  });
  it("timestampVersionHashes should failed if record doesn't exists", async () => {
    await expect(
      ts.timestampVersionHashes(
        [89],
        [1, 2, 0],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [8],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [ethers.utils.toUtf8Bytes("btc"), ethers.utils.toUtf8Bytes("new"), []],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("wrong record count");
  });
  it("timestampVersionHashes should failed for empty value and hash", async () => {
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
        [0, 1, 2],
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashValue empty");

    await expect(
      ts.timestampVersionHashes(
        [],
        [1, 2, 0],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [8],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [ethers.utils.toUtf8Bytes("btc"), ethers.utils.toUtf8Bytes("new"), []],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("versionHash empty");
    //  should not revert is optional params are empty
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const tsids = [
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8")),
      ethers.utils.sha256([8]),
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("38862f7ef56079768")),
    ];

    await expect(
      ts.timestampVersionHashes(
        hash1,
        [2, 0, 1],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [8],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [],
        [],
      ),
    )
      .to.emit(ts, "TimestampedHashes")
      .withArgs(
        tsids,
        [2, 0, 1],
        [
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8")),
          ethers.utils.hexlify([8]),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes("38862f7ef56079768")),
        ],
        [],
      );
  });
  // TODO it("timestampVersionHashes should failed for too many records", async   () => {});
  it("timestampVersionHashes should failed for empty records", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await expect(
      ts.timestampVersionHashes(
        hash1,
        [0, 1, 2],
        [hash1, hash2, hash3],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("wrong record count");
  });
  it("timestampVersionHashes should failed for two records", async () => {
    const hash1 = randomHash();
    const hash2 = randomHash();
    const hash3 = randomHash();
    const hash4 = randomHash();

    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    await ts.timestampRecordHashes(
      [0, 1],
      [hash4, hash2], // new record with timestamp used in the previous one
      [],
      ethers.utils.toUtf8Bytes("info"),
    );

    // timestampVersionHashes can not be used to add a version, because
    // the timestamp id is not enough to know the record id
    await expect(
      ts.timestampVersionHashes(
        hash2, // hash linked to 2 records
        [0, 1, 2],
        [hash1, hash2, hash3],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        [],
      ),
    ).to.be.revertedWith("wrong record count");
  });
  it("timestampVersionHashes should fail for sender not owner", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const tsUser = ts.connect(user);
    await expect(
      tsUser.timestampVersionHashes(
        hash1,
        [0, 1, 2],
        [hash1, hash2, hash3],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("timestampVersionHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const tsids = [
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ];
    const timestampData = [
      ethers.utils.toUtf8Bytes("btc"),
      ethers.utils.toUtf8Bytes("new"),
      ethers.utils.toUtf8Bytes("ath"),
    ].map((d) => `0x${Buffer.from(d).toString("hex")}`);
    await expect(
      ts.timestampVersionHashes(
        hash1,
        [0, 1, 2],
        [hash1, hash2, hash3],
        timestampData,
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    )
      .to.emit(ts, "TimestampedHashes")
      .withArgs(
        tsids,
        [0, 1, 2],
        [
          ethers.utils.hexlify(hash1),
          ethers.utils.hexlify(hash2),
          ethers.utils.hexlify(hash3),
        ],
        timestampData,
      );
    // should work with empty  versionInfo
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      timestampData,
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    await ts.timestampVersionHashes(
      hash1prime,
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      timestampData,
      [],
    );
  });
  it("timestampVersionHashes should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const tsids = [
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ];
    await expect(
      ts.timestampVersionHashes(
        hash1,
        [0, 1, 2],
        [hash1, hash2, hash3],
        [],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    )
      .to.emit(ts, "TimestampedHashes")
      .withArgs(
        tsids,
        [0, 1, 2],
        [
          ethers.utils.hexlify(hash1),
          ethers.utils.hexlify(hash2),
          ethers.utils.hexlify(hash3),
        ],
        [],
      );

    // should work with empty  versionInfo
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    await ts.timestampVersionHashes(
      hash1prime,
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      [],
      [],
    );
  });
  it("timestampRecordHashes should failed if hash algo and values length are different", async () => {
    await expect(
      ts.timestampRecordHashes(
        [0, 1],
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashvalue/algo count mismatch");
  });
  it("timestampRecordHashes should failed if > 3", async () => {
    await expect(
      ts.timestampRecordHashes(
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampRecordHashes(
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampRecordHashes(
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("timestampData>3");
  });
  it("timestampRecordHashes should failed for unknown hash algo", async () => {
    await expect(
      ts.timestampRecordHashes(
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashAlgo unknown");
  });
  it("timestampRecordHashes should failed for empty value and hash", async () => {
    await expect(
      ts.timestampRecordHashes(
        [0, 1, 2],
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashValue empty");

    // should not revert is optional params are empty
    await ts.timestampRecordHashes(
      [2, 1, 0],
      [
        ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
        [8],
        ethers.utils.toUtf8Bytes("38862f7ef56079768"),
      ],
      [],
      [],
    );
  });
  it("timestampRecordHashes should suceed with same info twice because recordId contains blocknumber", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");

    ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
  });
  it("timestampRecordHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const tsids = [
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    const versionInfo = ethers.utils.toUtf8Bytes("info: btc to the moon");
    await expect(
      ts.timestampRecordHashes(
        [0, 1, 2],
        [hash1, hash2, hash3],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        versionInfo,
      ),
    )
      .to.emit(ts, "NewRecord")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfo).toString("hex")}`,
        ethers.utils.sha256(versionInfo),
        admin.address.toLowerCase(),
      );
  });
  it("timestampRecordHashes should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const tsids = [
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    const versionInfo = ethers.utils.toUtf8Bytes("info: btc to the moon");
    await expect(
      ts.timestampRecordHashes(
        [0, 1, 2],
        [hash1, hash2, hash3],
        [],
        versionInfo,
      ),
    )
      .to.emit(ts, "NewRecord")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfo).toString("hex")}`,
        ethers.utils.sha256(versionInfo),
        admin.address.toLowerCase(),
      );
  });

  it("timestampRecordVersionHashes should failed if > 3", async () => {
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("timestampData>3");
  });
  it("timestampRecordVersionHashes should failed for unknown hash algo", async () => {
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashAlgo unknown");
  });
  it("timestampRecordVersionHashes should failed if record doesn't exists", async () => {
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256([89]),
        [1, 2, 0],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [8],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [ethers.utils.toUtf8Bytes("btc"), ethers.utils.toUtf8Bytes("new"), []],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("record unknown");
  });
  it("timestampRecordVersionHashes should failed for empty value and hash", async () => {
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
        [0, 1, 2],
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
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("hashValue empty");

    await expect(
      ts.timestampRecordVersionHashes(
        ethers.constants.HashZero,
        [1, 2, 0],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [8],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [ethers.utils.toUtf8Bytes("btc"), ethers.utils.toUtf8Bytes("new"), []],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.be.revertedWith("recordId empty");
    //  should not revert is optional params are empty
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const tsids = [
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8")),
      ethers.utils.sha256([8]),
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("38862f7ef56079768")),
    ];

    await expect(
      ts.timestampRecordVersionHashes(
        recordId,
        [2, 0, 1],
        [
          ethers.utils.toUtf8Bytes("e40605e6a26268a5eb8"),
          [8],
          ethers.utils.toUtf8Bytes("38862f7ef56079768"),
        ],
        [],
        [],
      ),
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, "0x", ethers.constants.HashZero);
  });
  it("timestampRecordVersionHashes should fail for sender not owner", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const tsUser = ts.connect(user);
    const versionInfoprime = ethers.utils.toUtf8Bytes("new infon");
    await expect(
      tsUser.timestampRecordVersionHashes(
        recordId,
        [2, 0, 1],
        [hash1prime, hash2prime, hash3prime],
        [
          ethers.utils.toUtf8Bytes("oneprime"),
          ethers.utils.toUtf8Bytes("twoprime"),
          ethers.utils.toUtf8Bytes("threeprime"),
        ],
        versionInfoprime,
      ),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("timestampRecordVersionHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
      ethers.utils.sha256(hash3prime),
    ];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new infon");
    await expect(
      ts.timestampRecordVersionHashes(
        recordId,
        [2, 0, 1],
        [hash1prime, hash2prime, hash3prime],
        [
          ethers.utils.toUtf8Bytes("oneprime"),
          ethers.utils.toUtf8Bytes("twoprime"),
          ethers.utils.toUtf8Bytes("threeprime"),
        ],
        versionInfoprime,
      ),
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfoprime).toString("hex")}`,
        ethers.utils.sha256(versionInfoprime),
      );
  });
  it("timestampRecordVersionHashes should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
      ethers.utils.sha256(hash3prime),
    ];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new infon");
    await expect(
      ts.timestampRecordVersionHashes(
        recordId,
        [2, 0, 1],
        [hash1prime, hash2prime, hash3prime],
        [],
        versionInfoprime,
      ),
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfoprime).toString("hex")}`,
        ethers.utils.sha256(versionInfoprime),
      );
  });

  it("getRecord should failed with wrong recordId", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");

    // pagesize = 0 should revert
    await expect(ts.getRecord(ethers.constants.HashZero)).to.be.revertedWith(
      "recordId empty",
    );
    // page  = 0 should revert
    await expect(ts.getRecord(ethers.utils.sha256(hash1))).to.be.revertedWith(
      "record unknown",
    );
  });
  it("getRecord should succeed", async () => {
    const hash1Value = ethers.utils.toUtf8Bytes(`value-1`);
    const hash2Value = ethers.utils.toUtf8Bytes(`value-2`);
    const hash3Value = ethers.utils.toUtf8Bytes(`value-3`);
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1Value],
      ),
    );
    // INSERT SHOULD BE DONE IN ORDER !!!
    // eslint-disable-next-line no-await-in-loop
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1Value, hash2Value, hash3Value],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.have.length(1);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    // add version
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
      ethers.utils.sha256(hash3prime),
    ];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new infon");
    await expect(
      ts.timestampRecordVersionHashes(
        recordId,
        [2, 0, 1],
        [hash1prime, hash2prime, hash3prime],
        [
          ethers.utils.toUtf8Bytes("oneprime"),
          ethers.utils.toUtf8Bytes("twoprime"),
          ethers.utils.toUtf8Bytes("threeprime"),
        ],
        versionInfoprime,
      ),
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfoprime).toString("hex")}`,
        ethers.utils.sha256(versionInfoprime),
      );
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r1.revokedOwnerIds).to.deep.equal([]);
    expect(r1.totalVersions).to.equal(2);
    /// add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([
      admin.address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r2.revokedOwnerIds).to.deep.equal([]);
    expect(r2.totalVersions).to.equal(2);
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const r3 = await ts.getRecord(recordId);
    expect(r3.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r3.revokedOwnerIds).to.deep.equal(["anotherownerId"]);
    expect(r2.totalVersions).to.equal(2);
  });

  it("getRecordVersion should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashvalues = [hash1, hash2, hash3];

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ];
    const timestampData = [
      ethers.utils.toUtf8Bytes("btcprime"),
      ethers.utils.toUtf8Bytes("new prime"),
    ].map((d) => `0x${Buffer.from(d).toString("hex")}`);
    await expect(
      ts.timestampVersionHashes(
        hash1,
        [2, 0],
        hashvaluesprime,
        timestampData,
        [],
      ),
    )
      .to.emit(ts, "TimestampedHashes")
      .withArgs(
        tsids,
        [2, 0],
        [ethers.utils.hexlify(hash1prime), ethers.utils.hexlify(hash2prime)],
        timestampData,
      );
  });

  it("getRecordVersionInfo should failed with empty versionInfoId", async () => {
    //  should revert
    await expect(
      ts.getRecordVersionInfo(ethers.constants.HashZero),
    ).to.be.revertedWith("versionInfoId empty");
  });
  it("getRecordVersionInfo should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashvalues = [hash1, hash2, hash3];

    const versionInfo = ethers.utils.toUtf8Bytes("info: btc to the moon");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      versionInfo,
    );

    const info = await ts.getRecordVersionInfo(
      ethers.utils.sha256(versionInfo),
    );
    expect(info).to.equal(ethers.utils.hexlify(versionInfo));

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];

    const versionInfoprime = ethers.utils.toUtf8Bytes(
      "PRIME info: btc to the moon",
    );
    await expect(
      ts.timestampVersionHashes(
        hash1,
        [2, 0],
        hashvaluesprime,
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        versionInfoprime,
      ),
    );
    const infoPrime = await ts.getRecordVersionInfo(
      ethers.utils.sha256(versionInfoprime),
    );
    expect(infoPrime).to.equal(ethers.utils.hexlify(versionInfoprime));
  });

  it("appendRecordVersionHashes should failed with empty recordId", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");

    await expect(
      ts.appendRecordVersionHashes(
        ethers.constants.HashZero,
        0,
        [2],
        [hash1],
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        [],
      ),
    ).to.be.revertedWith("recordId empty");
  });
  it("appendRecordVersionHashes should failed for unknown recordId or versionId", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    await expect(
      ts.appendRecordVersionHashes(
        ethers.utils.sha256(hash1),
        0,
        [0],
        [hash1],
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        [],
      ),
    ).to.be.revertedWith("record/version unknown");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await ts.timestampRecordHashes(
      [0],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    // version  does not exist should revert
    await expect(
      ts.appendRecordVersionHashes(
        recordId,
        1,
        [0],
        [hash1],
        [ethers.utils.toUtf8Bytes("second one")],
        [],
      ),
    ).to.be.revertedWith("record/version unknown");
  });

  it("should reject more than 10 records per timestamp", async () => {
    const hash1 = randomHash();
    // create 10 records sharing the same hash
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await ts.timestampRecordHashes(
        [0, 1],
        [randomHash(), hash1],
        [],
        ethers.utils.toUtf8Bytes("info"),
      );
    }
    // the 11th record should be rejected
    await expect(
      ts.timestampRecordHashes(
        [0, 1],
        [randomHash(), hash1],
        [],
        ethers.utils.toUtf8Bytes("info"),
      ),
    ).to.be.revertedWith("limit of records per timestamp exceeded");
  });

  it("should reject more than 10 timestamps per version in a record", async () => {
    const hash1 = randomHash();

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    // create record
    await ts.timestampRecordHashes(
      [0],
      [hash1],
      [],
      ethers.utils.toUtf8Bytes("info"),
    );

    // append new timestamps to the first version of that record
    for (let i = 0; i < 9; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await ts.appendRecordVersionHashes(
        recordId,
        0,
        [0],
        [randomHash()],
        [],
        [],
      );
    }

    // the 11th timestamp should be rejected
    await expect(
      ts.appendRecordVersionHashes(recordId, 0, [0], [randomHash()], [], []),
    ).to.be.revertedWith("limit of timestamps per version exceeded");
  });

  it("should reject 2 timestamps with different hash algorithms", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    await ts.timestampRecordHashes(
      [0],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    await expect(ts.timestampHashes([1], [hash1], [], [])).to.be.revertedWith(
      "timestamp with different hashAlgo",
    );
  });
  it("appendRecordVersionHashes should fail for sender not owner", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashvalues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new info");
    const tsUser = ts.connect(user);
    await expect(
      tsUser.appendRecordVersionHashes(
        recordId,
        0,
        [2, 0],
        hashvaluesprime,
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        versionInfoprime,
      ),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("appendRecordVersionHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let hashvalues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await expect(
      ts.timestampRecordHashes(
        [0, 1, 2],
        hashvalues,
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon"),
      ),
    ).to.emit(ts, "NewRecord");

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new info");
    await expect(
      ts.appendRecordVersionHashes(
        recordId,
        0,
        [2, 0],
        hashvaluesprime,
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        versionInfoprime,
      ),
    )
      .to.emit(ts, "VersionUpdated")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfoprime).toString("hex")}`,
        ethers.utils.sha256(versionInfoprime),
        0,
      );
    hashvalues = [...hashvalues, ...hashvaluesprime];
  });
  it("appendRecordVersionHashes should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let hashvalues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new info");
    await expect(
      ts.appendRecordVersionHashes(
        recordId,
        0,
        [2, 0],
        hashvaluesprime,
        [],
        versionInfoprime,
      ),
    )
      .to.emit(ts, "VersionUpdated")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfoprime).toString("hex")}`,
        ethers.utils.sha256(versionInfoprime),
        0,
      );
    hashvalues = [...hashvalues, ...hashvaluesprime];
  });

  it("insertRecordVersionInfo should failed with empty recordId or versionInfo", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");

    await expect(
      ts.insertRecordVersionInfo(ethers.constants.HashZero, 0, []),
    ).to.be.revertedWith("recordId empty");
    await expect(
      ts.insertRecordVersionInfo(ethers.utils.sha256(hash1), 0, []),
    ).to.be.revertedWith("versionInfo empty");
  });
  it("insertRecordVersionInfo should failed for unknown recordId or versionId", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const versionInfo = ethers.utils.toUtf8Bytes("second one");
    await expect(
      ts.insertRecordVersionInfo(ethers.utils.sha256(hash1), 0, versionInfo),
    ).to.be.revertedWith("record/version unknown");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await ts.timestampRecordHashes(
      [0],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    // version  does not exist should revert
    await expect(
      ts.insertRecordVersionInfo(recordId, 1, versionInfo),
    ).to.be.revertedWith("record/version unknown");
  });
  it("insertRecordVersionInfo should fail for sender not owner", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashvalues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const versionInfoprime = ethers.utils.toUtf8Bytes("new info");
    const tsUser = ts.connect(user);
    await expect(
      tsUser.insertRecordVersionInfo(recordId, 0, versionInfoprime),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("insertRecordVersionInfo should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashvalues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const versionInfoprime = ethers.utils.toUtf8Bytes("new info");

    await expect(
      ts.insertRecordVersionInfo(recordId, 0, versionInfoprime),
    ).to.emit(ts, "RecordVersionInfo");
  });

  it("detachRecordVersionHash should fail for sender not owner", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    // will create a version 0 with one timestamp Id (sha256(hash1)) under recordId
    await ts.timestampRecordHashes(
      [1],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      [],
    );
    const tsUser = ts.connect(user);
    await expect(
      tsUser.detachRecordVersionHash(recordId, 0, hash1),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("detachRecordVersionHash should succeed with only one tsId in the version", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    // will create a version 0 with one timestamp Id (sha256(hash1)) under recordId
    await ts.timestampRecordHashes(
      [1],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      [],
    );
    await expect(ts.detachRecordVersionHash(recordId, 0, hash1)).to.emit(
      ts,
      "TimestampIdDetached",
    );
  });

  it("getRecordIdsByOwnerId should succeed", async () => {
    const hash1Value = ethers.utils.toUtf8Bytes(`value-1`);
    const hash2Value = ethers.utils.toUtf8Bytes(`value-2`);
    const hash3Value = ethers.utils.toUtf8Bytes(`value-3`);
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1Value],
      ),
    );
    // INSERT SHOULD BE DONE IN ORDER !!!
    // eslint-disable-next-line no-await-in-loop
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1Value, hash2Value, hash3Value],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.have.length(1);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    // add version
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
      ethers.utils.sha256(hash3prime),
    ];
    const versionInfoprime = ethers.utils.toUtf8Bytes("new infon");
    await expect(
      ts.timestampRecordVersionHashes(
        recordId,
        [2, 0, 1],
        [hash1prime, hash2prime, hash3prime],
        [
          ethers.utils.toUtf8Bytes("oneprime"),
          ethers.utils.toUtf8Bytes("twoprime"),
          ethers.utils.toUtf8Bytes("threeprime"),
        ],
        versionInfoprime,
      ),
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(
        recordId,
        tsids,
        `0x${Buffer.from(versionInfoprime).toString("hex")}`,
        ethers.utils.sha256(versionInfoprime),
      );
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r1.revokedOwnerIds).to.deep.equal([]);
    expect(r1.totalVersions).to.equal(2);
    /// add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([
      admin.address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r2.revokedOwnerIds).to.deep.equal([]);
    expect(r2.totalVersions).to.equal(2);
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const r3 = await ts.getRecord(recordId);
    expect(r3.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r3.revokedOwnerIds).to.deep.equal(["anotherownerId"]);
    expect(r2.totalVersions).to.equal(2);
  });

  it("revokeRecordOwner should failed with wrong recordId, OwnerId ", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    await expect(ts.revokeRecordOwner(recordId, "")).to.be.revertedWith(
      "ownerId empty",
    );

    await expect(
      ts.revokeRecordOwner(ethers.constants.HashZero, "ownerId"),
    ).to.be.revertedWith("recordId empty");

    await expect(
      ts.revokeRecordOwner(ethers.utils.sha256(hash1), admin.address),
    ).to.be.revertedWith("record unknown");

    await expect(
      ts.revokeRecordOwner(recordId, user.address),
    ).to.be.revertedWith("ownerId unknown");
  });
  it("revokeRecordOwner should fail for sender not owner", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    // add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.deep.equal([
      admin.address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    // revoke the second owner
    const tsUser = ts.connect(user);
    await expect(
      tsUser.revokeRecordOwner(recordId, "anotherownerId"),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("revokeRecordOwner should work", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    // add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.deep.equal([
      admin.address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    // revoke the second owner
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r1.revokedOwnerIds).to.deep.equal(["anotherownerId"]);
    expect(r1.totalVersions).to.equal(1);

    // revoke the first owner warning ownerId is case sensitive
    await ts.revokeRecordOwner(recordId, admin.address.toLowerCase());
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([]);
    expect(r2.revokedOwnerIds).to.deep.equal([
      "anotherownerId",
      admin.address.toLowerCase(),
    ]);
    expect(r2.totalVersions).to.equal(1);
  });

  it("insertRecordOwner should failed with wrong date, recordId, OwnerId ", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    await expect(ts.insertRecordOwner(recordId, "", 1, 2)).to.be.revertedWith(
      "ownerId empty",
    );
    await expect(
      ts.insertRecordOwner(ethers.constants.HashZero, "ownerId", 1, 2),
    ).to.be.revertedWith("recordId empty");
    await expect(
      ts.insertRecordOwner(ethers.utils.sha256(hash1), "ownerId", 1, 2),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.insertRecordOwner(recordId, admin.address.toLowerCase(), 1, 2),
    ).to.be.revertedWith("ownerId exist");
    // notBefore== 0 &&  notAfter ==0
    await expect(
      ts.insertRecordOwner(recordId, "ownerId", 0, 0),
    ).to.be.revertedWith("date incorrect");
    // notBefore== 0 &&  notAfter>0
    await expect(
      ts.insertRecordOwner(recordId, "ownerId", 0, 2),
    ).to.be.revertedWith("date incorrect");
    // notBefore== 2 &&  notAfter ==1
    await expect(
      ts.insertRecordOwner(recordId, "ownerId", 2, 1),
    ).to.be.revertedWith("date incorrect");
  });
  it("insertRecordOwner should fail for sender not owner ", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);
    const tsUser = ts.connect(user);
    await expect(
      tsUser.insertRecordOwner(recordId, "ownerId", 1, 2),
    ).to.be.revertedWith("sender is not listed as owner");
  });
  it("insertRecordOwner should work ", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.deep.equal([admin.address.toLowerCase()]);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    await ts.insertRecordOwner(recordId, "ownerId", 1, 2);
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([admin.address.toLowerCase(), "ownerId"]);
    expect(r1.revokedOwnerIds).to.deep.equal([]);
    expect(r1.totalVersions).to.equal(1);

    await ts.insertRecordOwner(recordId, "anotherOwnerId", 112345646787, 0);
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([
      admin.address.toLowerCase(),
      "ownerId",
      "anotherOwnerId",
    ]);
    expect(r2.revokedOwnerIds).to.deep.equal([]);
    expect(r2.totalVersions).to.equal(1);
  });

  it("getRecordOwnerInfo should failed with wrong recordId, OwnerId ", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );

    await expect(ts.getRecordOwnerInfo(recordId, "")).to.be.revertedWith(
      "ownerId empty",
    );

    await expect(
      ts.getRecordOwnerInfo(ethers.constants.HashZero, "ownerId"),
    ).to.be.revertedWith("recordId empty");

    await expect(
      ts.getRecordOwnerInfo(ethers.utils.sha256(hash1), admin.address),
    ).to.be.revertedWith("record unknown");
  });

  it("getRecordOwnerInfo should work", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [admin.address, blockNumber, hash1],
      ),
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon"),
    );
    const blockTs = await ethers.provider.getBlock(blockNumber);

    const inf1 = await ts.getRecordOwnerInfo(
      recordId,
      admin.address.toLowerCase(),
    );
    expect(inf1.notBefore).to.equal(blockTs.timestamp);
    expect(inf1.notAfter).to.equal(MAX_UINT256);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(inf1.revoked).to.be.false;

    // add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const inf2 = await ts.getRecordOwnerInfo(recordId, "anotherownerId");
    expect(inf2.notBefore).to.equal(notBefore);
    expect(inf2.notAfter).to.equal(notAfter);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(inf2.revoked).to.be.false;

    // revoke the second owner
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const inf3 = await ts.getRecordOwnerInfo(recordId, "anotherownerId");
    expect(inf3.notBefore).to.equal(notBefore);
    expect(inf3.notAfter).to.equal(notAfter);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(inf3.revoked).to.be.true;

    // revoke the first owner warning ownerId is case sensitive
    await ts.revokeRecordOwner(recordId, admin.address.toLowerCase());
    const inf4 = await ts.getRecordOwnerInfo(
      recordId,
      admin.address.toLowerCase(),
    );
    expect(inf4.notBefore).to.equal(blockTs.timestamp);
    expect(inf4.notAfter).to.equal(MAX_UINT256);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(inf4.revoked).to.be.true;
  });
});
