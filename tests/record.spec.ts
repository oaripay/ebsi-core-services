import { ethers, waffle } from "hardhat";
import { Contract, Signer } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import StringManipArtifact from "../artifacts/contracts/bootstrap-ethereum-sc/contracts/utils/StringManip.sol/StringManip.json";

const { deployContract } = waffle;

describe("Record Hashes", () => {
  let ts: Contract;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    // 1
    signers = await ethers.getSigners();
    const stringManipLib = await deployContract(
      <Signer>signers[0],
      StringManipArtifact,
      []
    );
    // 2
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
    ts = await contractFactory.deploy();

    await ts.init(42);
    const initialVersion = await ts.version();
    // 3
    expect(initialVersion).to.equal(42);
    expect(ts.address).to.be.properAddress;
    // add hashAlgo
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampVersionHashes(
        ethers.utils.toUtf8Bytes("versionHash"),
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        []
      )
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
        []
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("wrong record count");
  });
  it("timestampVersionHashes should failed for two records", async () => {
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        []
      );
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);
    // should work with empty  versionInfo
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
        []
      )
    ).to.be.revertedWith("wrong record count");
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        []
      );
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);
    // should work with empty  versionInfo
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    await ts.timestampVersionHashes(
      hash1prime,
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      []
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        []
      );
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);

    // should work with empty  versionInfo
    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    await ts.timestampVersionHashes(
      hash1prime,
      [0, 1, 2],
      [hash1prime, hash2, hash3],
      [],
      []
    );
  });

  it("timestampRecordHashes should failed if hash algo and values length are different", async () => {
    await expect(
      ts.timestampRecordHashes(
        [0, 1],
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashvalue/algo count mismatch");
  });
  it("timestampRecordHashes should failed if > 3", async () => {
    await expect(
      ts.timestampRecordHashes(
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampRecordHashes(
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampRecordHashes(
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
      []
    );
    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await expect(
      ts.timestampRecordHashes(
        [0, 1, 2],
        [hash1, hash2, hash3],
        [
          ethers.utils.toUtf8Bytes("btc"),
          ethers.utils.toUtf8Bytes("new"),
          ethers.utils.toUtf8Bytes("ath"),
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(
        recordId,
        tsids,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
      );
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);
    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    const firstTsIds = await ts.getRecordIdsByFirstVersionHash(hash2, 1, 10);
    expect(firstTsIds.items).to.deep.equal([recordId]);
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await expect(
      ts.timestampRecordHashes(
        [0, 1, 2],
        [hash1, hash2, hash3],
        [],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(
        recordId,
        tsids,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
      );
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);
    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    const firstTsIds = await ts.getRecordIdsByFirstVersionHash(hash2, 1, 10);
    expect(firstTsIds.items).to.deep.equal([recordId]);
  });

  it("timestampRecordVersionHashes should failed if > 3", async () => {
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashAlgorithmIds>3");
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
    ).to.be.revertedWith("hashValues>3");
    await expect(
      ts.timestampRecordVersionHashes(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("recordId")),
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
        ],
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      )
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        []
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.constants.HashZero);
  });
  it("timestampRecordVersionHashes should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashValues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const hashPrimeValues = [hash1prime, hash2prime, hash3prime];
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
        versionInfoprime
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.utils.sha256(versionInfoprime));

    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
      ethers.utils.sha256(hash3prime),
    ]);
    // check that two versions exists
    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd0.hashAlgorithmIds).to.have.length(3);
    expect(vd0.hashAlgorithmIds[0]).to.equal(0);
    expect(vd0.hashAlgorithmIds[1]).to.equal(1);
    expect(vd0.hashAlgorithmIds[2]).to.equal(2);
    expect(vd0.hashValues).to.have.length(3);
    vd0.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashValues[id]));
    });
    // expect(vd0.hashValues).to.equal([hash1, hash2, hash3]);
    expect(vd0.infoIds).to.have.length(1);
    expect(vd0.infoIds[0]).to.equal(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
    );
    expect(vd0.total).to.equal(3);
    expect(vd0.howMany).to.equal(3);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    const vd1 = await ts.getRecordVersion(recordId, 1, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(3);
    expect(vd1.hashAlgorithmIds[0]).to.equal(2);
    expect(vd1.hashAlgorithmIds[1]).to.equal(0);
    expect(vd1.hashAlgorithmIds[2]).to.equal(1);
    expect(vd1.hashValues).to.have.length(3);
    vd1.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashPrimeValues[id]));
    });
    // expect(vd0.hashValues).to.equal([hash1, hash2, hash3]);
    expect(vd1.infoIds).to.have.length(1);
    expect(vd1.infoIds[0]).to.equal(ethers.utils.sha256(versionInfoprime));
    expect(vd1.total).to.equal(3);
    expect(vd1.howMany).to.equal(3);
    expect(vd1.prev).to.equal(1);
    expect(vd1.next).to.equal(1);
  });
  it("timestampRecordVersionHashes should succeed with empty data", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    const hashValues = [hash1, hash2, hash3];
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    const hash1prime = ethers.utils.toUtf8Bytes("othere40605e6");
    const hash2prime = ethers.utils.toUtf8Bytes("again40605e6");
    const hash3prime = ethers.utils.toUtf8Bytes("new40605e6");
    const hashPrimeValues = [hash1prime, hash2prime, hash3prime];
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
        versionInfoprime
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.utils.sha256(versionInfoprime));

    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
      ethers.utils.sha256(hash3prime),
    ]);
    // check that two versions exists
    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd0.hashAlgorithmIds).to.have.length(3);
    expect(vd0.hashAlgorithmIds[0]).to.equal(0);
    expect(vd0.hashAlgorithmIds[1]).to.equal(1);
    expect(vd0.hashAlgorithmIds[2]).to.equal(2);
    expect(vd0.hashValues).to.have.length(3);
    vd0.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashValues[id]));
    });
    // expect(vd0.hashValues).to.equal([hash1, hash2, hash3]);
    expect(vd0.infoIds).to.have.length(1);
    expect(vd0.infoIds[0]).to.equal(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
    );
    expect(vd0.total).to.equal(3);
    expect(vd0.howMany).to.equal(3);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    const vd1 = await ts.getRecordVersion(recordId, 1, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(3);
    expect(vd1.hashAlgorithmIds[0]).to.equal(2);
    expect(vd1.hashAlgorithmIds[1]).to.equal(0);
    expect(vd1.hashAlgorithmIds[2]).to.equal(1);
    expect(vd1.hashValues).to.have.length(3);
    vd1.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashPrimeValues[id]));
    });
    // expect(vd0.hashValues).to.equal([hash1, hash2, hash3]);
    expect(vd1.infoIds).to.have.length(1);
    expect(vd1.infoIds[0]).to.equal(ethers.utils.sha256(versionInfoprime));
    expect(vd1.total).to.equal(3);
    expect(vd1.howMany).to.equal(3);
    expect(vd1.prev).to.equal(1);
    expect(vd1.next).to.equal(1);
  });

  it("getRecord should failed with wrong recordId", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");

    // pagesize = 0 should revert
    await expect(ts.getRecord(ethers.constants.HashZero)).to.be.revertedWith(
      "recordId empty"
    );
    // page  = 0 should revert
    await expect(ts.getRecord(ethers.utils.sha256(hash1))).to.be.revertedWith(
      "record unknown"
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
        [signers[0].address, blockNumber, hash1Value]
      )
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        versionInfoprime
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.utils.sha256(versionInfoprime));
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([signers[0].address.toLowerCase()]);
    expect(r1.revokedOwnerIds).to.deep.equal([]);
    expect(r1.totalVersions).to.equal(2);
    /// add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([
      signers[0].address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r2.revokedOwnerIds).to.deep.equal([]);
    expect(r2.totalVersions).to.equal(2);
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const r3 = await ts.getRecord(recordId);
    expect(r3.ownerIds).to.deep.equal([signers[0].address.toLowerCase()]);
    expect(r3.revokedOwnerIds).to.deep.equal(["anotherownerId"]);
    expect(r2.totalVersions).to.equal(2);
  });

  it("getRecordIds should failed with wrong page and pageSize", async () => {
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    // pagesize = 0 should revert
    await expect(ts.getRecordIds(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getRecordIds(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getRecordIds(1, 51)).to.be.revertedWith("PSize not <= 50");
  });
  it("getRecordIds should succeed", async () => {
    const recIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const hash1Value = ethers.utils.toUtf8Bytes(`value-1-${i}`);
      const hash2Value = ethers.utils.toUtf8Bytes(`value-2-${i}`);
      const hash3Value = ethers.utils.toUtf8Bytes(`value-3-${i}`);
      // eslint-disable-next-line no-await-in-loop
      let blockNumber = await ethers.provider.getBlockNumber();
      blockNumber += 1;
      //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
      const recordId = ethers.utils.sha256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "bytes"],
          [signers[0].address, blockNumber, hash1Value]
        )
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
        ethers.utils.toUtf8Bytes("info: btc to the moon")
      );
      recIds.push(recordId);
    }

    const r0 = await ts.getRecordIds(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(recIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getRecordIds(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(recIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getRecordIds(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getRecordIdsByFirstVersionHash should failed with wrong hash, page and pageSize", async () => {
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    // pagesize = 0 should revert
    await expect(
      ts.getRecordIdsByFirstVersionHash(hash1, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getRecordIdsByFirstVersionHash(hash1, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getRecordIdsByFirstVersionHash(hash1, 1, 51)
    ).to.be.revertedWith("PSize not <= 50");
    // hash empty
    await expect(
      ts.getRecordIdsByFirstVersionHash([], 1, 51)
    ).to.be.revertedWith("hashValue empty");
  });
  it("getRecordIdsByFirstVersionHash should succeed", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );

    ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    const firstTsIds = await ts.getRecordIdsByFirstVersionHash(hash2, 1, 10);
    expect(firstTsIds.items).to.deep.equal([recordId]);
    expect(firstTsIds.total).to.equal(1);
    expect(firstTsIds.howMany).to.equal(1);
    expect(firstTsIds.prev).to.equal(1);
    expect(firstTsIds.next).to.equal(1);
    blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId2 = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash2]
      )
    );
    ts.timestampRecordHashes(
      [0, 1],
      [hash2, hash3],
      [ethers.utils.toUtf8Bytes("yolo")],
      []
    );
    const firstTsIds2 = await ts.getRecordIdsByFirstVersionHash(hash2, 1, 10);
    expect(firstTsIds2.items).to.deep.equal([recordId, recordId2]);
    expect(firstTsIds2.total).to.equal(2);
    expect(firstTsIds2.howMany).to.equal(2);
    expect(firstTsIds2.prev).to.equal(1);
    expect(firstTsIds2.next).to.equal(1);
  });

  it("getRecordVersion should succeed", async () => {
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
        [signers[0].address, blockNumber, hash1]
      )
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];
    const tsids = [
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ];
    await expect(
      ts.timestampVersionHashes(
        hash1,
        [2, 0],
        hashvaluesprime,
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        []
      )
    )
      .to.emit(ts, "TimestampedHashes")
      .withArgs(
        tsids,
        [2, 0],
        [ethers.utils.hexlify(hash1prime), ethers.utils.hexlify(hash2prime)],
        []
      );

    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ]);

    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    expect(ids.items[0]).to.equal(recordId);

    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd0.hashAlgorithmIds).to.have.length(3);
    expect(vd0.hashAlgorithmIds[0]).to.equal(0);
    expect(vd0.hashAlgorithmIds[1]).to.equal(1);
    expect(vd0.hashAlgorithmIds[2]).to.equal(2);
    expect(vd0.hashValues).to.have.length(3);
    vd0.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashvalues[id]));
    });
    // expect(vd0.hashValues).to.equal([hash1, hash2, hash3]);
    expect(vd0.infoIds).to.have.length(1);
    expect(vd0.infoIds[0]).to.equal(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
    );
    expect(vd0.total).to.equal(3);
    expect(vd0.howMany).to.equal(3);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    const vd1 = await ts.getRecordVersion(recordId, 1, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(2);
    expect(vd1.hashAlgorithmIds[0]).to.equal(2);
    expect(vd1.hashAlgorithmIds[1]).to.equal(0);
    expect(vd1.hashValues).to.have.length(2);
    vd1.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashvaluesprime[id]));
    });
    expect(vd1.infoIds).to.have.length(0);
    expect(vd1.total).to.equal(2);
    expect(vd1.howMany).to.equal(2);
    expect(vd1.prev).to.equal(1);
    expect(vd1.next).to.equal(1);
  });
  it("getRecordVersion should failed with wrong recordId, page or pageSize", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const hash2 = ethers.utils.toUtf8Bytes("aa54def9");
    const hash3 = ethers.utils.toUtf8Bytes("38862f7");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    // pagesize = 0 should revert
    await expect(
      ts.getRecordVersion(ethers.constants.HashZero, 0, 1, 0)
    ).to.be.revertedWith("recordId empty");
    // pagesize = 0 should revert
    await expect(ts.getRecordVersion(recordId, 0, 1, 0)).to.be.revertedWith(
      "PSize not >0"
    );
    // page  = 0 should revert
    await expect(ts.getRecordVersion(recordId, 0, 0, 10)).to.be.revertedWith(
      "Page not >0"
    );

    // pagesize > 50 should revert
    await expect(ts.getRecordVersion(recordId, 0, 1, 51)).to.be.revertedWith(
      "PSize not <= 50"
    );
  });

  it("getRecordVersionInfo should failed with empty versionInfoId", async () => {
    //  should revert
    await expect(
      ts.getRecordVersionInfo(ethers.constants.HashZero)
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
      versionInfo
    );

    const info = await ts.getRecordVersionInfo(
      ethers.utils.sha256(versionInfo)
    );
    expect(info).to.equal(ethers.utils.hexlify(versionInfo));

    const hash1prime = ethers.utils.toUtf8Bytes("e40605e6prime");
    const hash2prime = ethers.utils.toUtf8Bytes("aa54def9prime");
    const hashvaluesprime = [hash1prime, hash2prime];

    const versionInfoprime = ethers.utils.toUtf8Bytes(
      "PRIME info: btc to the moon"
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
        versionInfoprime
      )
    );
    const infoPrime = await ts.getRecordVersionInfo(
      ethers.utils.sha256(versionInfoprime)
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
        []
      )
    ).to.be.revertedWith("recordId empty");
  });
  it("appendRecordVersionHashes should failed for unknown recordId or versionId", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    await expect(
      ts.appendRecordVersionHashes(
        ethers.utils.sha256(hash1),
        0,
        [2],
        [hash1],
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        []
      )
    ).to.be.revertedWith("record/version unknown");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );

    await ts.timestampRecordHashes(
      [0],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    // version  does not exist should revert
    await expect(
      ts.appendRecordVersionHashes(
        recordId,
        1,
        [2],
        [hash1],
        [ethers.utils.toUtf8Bytes("second one")],
        []
      )
    ).to.be.revertedWith("record/version unknown");
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
        [signers[0].address, blockNumber, hash1]
      )
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        [
          ethers.utils.toUtf8Bytes("btcprime"),
          ethers.utils.toUtf8Bytes("new prime"),
        ],
        versionInfoprime
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.utils.sha256(versionInfoprime));
    hashvalues = [...hashvalues, ...hashvaluesprime];
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ]);

    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    expect(ids.items[0]).to.equal(recordId);

    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd0.hashAlgorithmIds).to.have.length(5);
    expect(vd0.hashAlgorithmIds[0]).to.equal(0);
    expect(vd0.hashAlgorithmIds[1]).to.equal(1);
    expect(vd0.hashAlgorithmIds[2]).to.equal(2);
    expect(vd0.hashAlgorithmIds[3]).to.equal(2);
    expect(vd0.hashAlgorithmIds[4]).to.equal(0);
    expect(vd0.hashValues).to.have.length(5);
    vd0.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashvalues[id]));
    });

    expect(vd0.infoIds).to.have.length(2);
    expect(vd0.infoIds[0]).to.equal(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
    );
    expect(vd0.infoIds[1]).to.equal(ethers.utils.sha256(versionInfoprime));
    expect(vd0.total).to.equal(5);
    expect(vd0.howMany).to.equal(5);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    const vd1 = await ts.getRecordVersion(recordId, 1, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(0);
    expect(vd1.hashValues).to.have.length(0);
    expect(vd1.infoIds).to.have.length(0);
    expect(vd1.total).to.equal(0);
    expect(vd1.howMany).to.equal(0);
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
        [signers[0].address, blockNumber, hash1]
      )
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        versionInfoprime
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.utils.sha256(versionInfoprime));
    hashvalues = [...hashvalues, ...hashvaluesprime];
    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
      ethers.utils.sha256(hash1prime),
      ethers.utils.sha256(hash2prime),
    ]);

    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    expect(ids.items[0]).to.equal(recordId);

    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd0.hashAlgorithmIds).to.have.length(5);
    expect(vd0.hashAlgorithmIds[0]).to.equal(0);
    expect(vd0.hashAlgorithmIds[1]).to.equal(1);
    expect(vd0.hashAlgorithmIds[2]).to.equal(2);
    expect(vd0.hashAlgorithmIds[3]).to.equal(2);
    expect(vd0.hashAlgorithmIds[4]).to.equal(0);
    expect(vd0.hashValues).to.have.length(5);
    vd0.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashvalues[id]));
    });

    expect(vd0.infoIds).to.have.length(2);
    expect(vd0.infoIds[0]).to.equal(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
    );
    expect(vd0.infoIds[1]).to.equal(ethers.utils.sha256(versionInfoprime));
    expect(vd0.total).to.equal(5);
    expect(vd0.howMany).to.equal(5);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    const vd1 = await ts.getRecordVersion(recordId, 1, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(0);
    expect(vd1.hashValues).to.have.length(0);
    expect(vd1.infoIds).to.have.length(0);
    expect(vd1.total).to.equal(0);
    expect(vd1.howMany).to.equal(0);
  });

  it("insertRecordVersionInfo should failed with empty recordId or versionInfo", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");

    await expect(
      ts.insertRecordVersionInfo(ethers.constants.HashZero, 0, [])
    ).to.be.revertedWith("recordId empty");
    await expect(
      ts.insertRecordVersionInfo(ethers.utils.sha256(hash1), 0, [])
    ).to.be.revertedWith("versionInfo empty");
  });
  it("insertRecordVersionInfo should failed for unknown recordId or versionId", async () => {
    //  should revert
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    const versionInfo = ethers.utils.toUtf8Bytes("second one");
    await expect(
      ts.insertRecordVersionInfo(ethers.utils.sha256(hash1), 0, versionInfo)
    ).to.be.revertedWith("record/version unknown");

    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );

    await ts.timestampRecordHashes(
      [0],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    // version  does not exist should revert
    await expect(
      ts.insertRecordVersionInfo(recordId, 1, versionInfo)
    ).to.be.revertedWith("record/version unknown");
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
        [signers[0].address, blockNumber, hash1]
      )
    );

    await ts.timestampRecordHashes(
      [0, 1, 2],
      hashvalues,
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    const versionInfoprime = ethers.utils.toUtf8Bytes("new info");

    await ts.insertRecordVersionInfo(recordId, 0, versionInfoprime);

    const receipt = await ts.getTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([
      ethers.utils.sha256(hash1),
      ethers.utils.sha256(hash2),
      ethers.utils.sha256(hash3),
    ]);

    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    expect(ids.items[0]).to.equal(recordId);

    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd0.hashAlgorithmIds).to.have.length(3);
    expect(vd0.hashAlgorithmIds[0]).to.equal(0);
    expect(vd0.hashAlgorithmIds[1]).to.equal(1);
    expect(vd0.hashAlgorithmIds[2]).to.equal(2);
    expect(vd0.hashValues).to.have.length(3);
    vd0.hashValues.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ethers.utils.hexlify(hashvalues[id]));
    });

    expect(vd0.infoIds).to.have.length(2);
    expect(vd0.infoIds[0]).to.equal(
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("info: btc to the moon"))
    );
    expect(vd0.infoIds[1]).to.equal(ethers.utils.sha256(versionInfoprime));
    expect(vd0.total).to.equal(3);
    expect(vd0.howMany).to.equal(3);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    const vd1 = await ts.getRecordVersion(recordId, 1, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(0);
    expect(vd1.hashValues).to.have.length(0);
    expect(vd1.infoIds).to.have.length(0);
    expect(vd1.total).to.equal(0);
    expect(vd1.howMany).to.equal(0);
  });

  it("detachRecordVersionHash should succeed with only one tsId in the version", async () => {
    const hash1 = ethers.utils.toUtf8Bytes("e40605e6");
    let blockNumber = await ethers.provider.getBlockNumber();
    blockNumber += 1;
    //  recordId = sha256(abi.encode(msg.sender, block.number, hashValue));
    const recordId = ethers.utils.sha256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [signers[0].address, blockNumber, hash1]
      )
    );
    // will create a version 0 with one timestamp Id (sha256(hash1)) under recordId
    await ts.timestampRecordHashes(
      [1],
      [hash1],
      [ethers.utils.toUtf8Bytes("btc")],
      []
    );
    const receiptBefore = await ts.getTimestamps(1, 10);

    expect(receiptBefore.items).to.deep.equal([ethers.utils.sha256(hash1)]);
    const vd0 = await ts.getRecordVersion(recordId, 0, 1, 10);

    expect(vd0.hashAlgorithmIds).to.have.length(1);
    expect(vd0.hashAlgorithmIds[0]).to.equal(1);
    expect(vd0.hashValues).to.have.length(1);
    expect(vd0.hashValues).to.deep.equal([ethers.utils.hexlify(hash1)]);
    expect(vd0.total).to.equal(1);
    expect(vd0.howMany).to.equal(1);
    expect(vd0.prev).to.equal(1);
    expect(vd0.next).to.equal(1);

    await ts.detachRecordVersionHash(recordId, 0, hash1);
    // should stay the same as we don't remove the timestamp we simply detach it from the version
    const receiptAfter = await ts.getTimestamps(1, 10);
    expect(receiptAfter.items).to.deep.equal([ethers.utils.sha256(hash1)]);

    const ids = await ts.getRecordIds(1, 10);
    expect(ids.items).to.have.length(1);
    expect(ids.items[0]).to.equal(recordId);

    const vd1 = await ts.getRecordVersion(recordId, 0, 1, 10);
    expect(vd1.hashAlgorithmIds).to.have.length(0);
    expect(vd1.hashValues).to.have.length(0);
    expect(vd1.total).to.equal(0);
    expect(vd1.howMany).to.equal(0);
  });

  it("getRecordIdsByOwnerId should failed with wrong recordId, OwnerId, page or pageSize", async () => {
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    // pagesize = 0 should revert
    await expect(ts.getRecordIdsByOwnerId("", 1, 10)).to.be.revertedWith(
      "ownerId empty"
    );
    // pagesize = 0 should revert
    await expect(ts.getRecordIdsByOwnerId("ownerId", 1, 0)).to.be.revertedWith(
      "PSize not >0"
    );
    // page  = 0 should revert
    await expect(ts.getRecordIdsByOwnerId("ownerId", 0, 10)).to.be.revertedWith(
      "Page not >0"
    );

    // pagesize > 50 should revert
    await expect(ts.getRecordIdsByOwnerId("ownerId", 1, 51)).to.be.revertedWith(
      "PSize not <= 50"
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
        [signers[0].address, blockNumber, hash1Value]
      )
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
      ethers.utils.toUtf8Bytes("info: btc to the moon")
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
        versionInfoprime
      )
    )
      .to.emit(ts, "RecordedHashes")
      .withArgs(recordId, tsids, ethers.utils.sha256(versionInfoprime));
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([signers[0].address.toLowerCase()]);
    expect(r1.revokedOwnerIds).to.deep.equal([]);
    expect(r1.totalVersions).to.equal(2);
    /// add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([
      signers[0].address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r2.revokedOwnerIds).to.deep.equal([]);
    expect(r2.totalVersions).to.equal(2);
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const r3 = await ts.getRecord(recordId);
    expect(r3.ownerIds).to.deep.equal([signers[0].address.toLowerCase()]);
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    await expect(ts.revokeRecordOwner(recordId, "")).to.be.revertedWith(
      "ownerId empty"
    );

    await expect(
      ts.revokeRecordOwner(ethers.constants.HashZero, "ownerId")
    ).to.be.revertedWith("recordId empty");

    await expect(
      ts.revokeRecordOwner(ethers.utils.sha256(hash1), signers[0].address)
    ).to.be.revertedWith("record unknown");

    await expect(
      ts.revokeRecordOwner(recordId, signers[1].address)
    ).to.be.revertedWith("ownerId unknown");
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    const blockTs = await ethers.provider.getBlock(blockNumber);
    // add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.deep.equal([
      signers[0].address.toLowerCase(),
      "anotherownerId",
    ]);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    // revoke the second owner
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([signers[0].address.toLowerCase()]);
    expect(r1.revokedOwnerIds).to.deep.equal(["anotherownerId"]);
    expect(r1.totalVersions).to.equal(1);

    // revoke the first owner warning ownerId is case sensitive
    await ts.revokeRecordOwner(recordId, signers[0].address.toLowerCase());
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([]);
    expect(r2.revokedOwnerIds).to.deep.equal([
      "anotherownerId",
      signers[0].address.toLowerCase(),
    ]);
    expect(r2.totalVersions).to.equal(1);
    // make sure we can add the one owner even if there is none and it was a previous owner
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const r4 = await ts.getRecord(recordId);
    expect(r4.ownerIds).to.deep.equal(["anotherownerId"]);

    const inf = await ts.getRecordOwnerInfo(recordId, "anotherownerId");
    expect(inf.notBefore).to.equal(notBefore);
    expect(inf.notAfter).to.equal(notAfter);
    expect(inf.revoked).to.be.false;

    const inf1 = await ts.getRecordOwnerInfo(
      recordId,
      signers[0].address.toLowerCase()
    );
    expect(inf1.notBefore).to.equal(blockTs.timestamp);
    expect(inf1.notAfter).to.equal(0);
    expect(inf1.revoked).to.be.true;
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    await expect(ts.insertRecordOwner(recordId, "", 1, 2)).to.be.revertedWith(
      "ownerId empty"
    );
    await expect(
      ts.insertRecordOwner(ethers.constants.HashZero, "ownerId", 1, 2)
    ).to.be.revertedWith("recordId empty");
    await expect(
      ts.insertRecordOwner(ethers.utils.sha256(hash1), "ownerId", 1, 2)
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.insertRecordOwner(recordId, signers[0].address.toLowerCase(), 1, 2)
    ).to.be.revertedWith("ownerId exist");
    // notBefore== 0 &&  notAfter ==0
    await expect(
      ts.insertRecordOwner(recordId, "ownerId", 0, 0)
    ).to.be.revertedWith("date incorrect");
    // notBefore== 0 &&  notAfter>0
    await expect(
      ts.insertRecordOwner(recordId, "ownerId", 0, 2)
    ).to.be.revertedWith("date incorrect");
    // notBefore== 2 &&  notAfter ==1
    await expect(
      ts.insertRecordOwner(recordId, "ownerId", 2, 1)
    ).to.be.revertedWith("date incorrect");
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    const r0 = await ts.getRecord(recordId);
    expect(r0.ownerIds).to.deep.equal([signers[0].address.toLowerCase()]);
    expect(r0.revokedOwnerIds).to.deep.equal([]);
    expect(r0.totalVersions).to.equal(1);

    await ts.insertRecordOwner(recordId, "ownerId", 1, 2);
    const r1 = await ts.getRecord(recordId);
    expect(r1.ownerIds).to.deep.equal([
      signers[0].address.toLowerCase(),
      "ownerId",
    ]);
    expect(r1.revokedOwnerIds).to.deep.equal([]);
    expect(r1.totalVersions).to.equal(1);

    await ts.insertRecordOwner(recordId, "anotherOwnerId", 112345646787, 0);
    const r2 = await ts.getRecord(recordId);
    expect(r2.ownerIds).to.deep.equal([
      signers[0].address.toLowerCase(),
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );

    await expect(ts.getRecordOwnerInfo(recordId, "")).to.be.revertedWith(
      "ownerId empty"
    );

    await expect(
      ts.getRecordOwnerInfo(ethers.constants.HashZero, "ownerId")
    ).to.be.revertedWith("recordId empty");

    await expect(
      ts.getRecordOwnerInfo(ethers.utils.sha256(hash1), signers[0].address)
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
        [signers[0].address, blockNumber, hash1]
      )
    );
    await ts.timestampRecordHashes(
      [0, 1, 2],
      [hash1, hash2, hash3],
      [
        ethers.utils.toUtf8Bytes("btc"),
        ethers.utils.toUtf8Bytes("new"),
        ethers.utils.toUtf8Bytes("ath"),
      ],
      ethers.utils.toUtf8Bytes("info: btc to the moon")
    );
    const blockTs = await ethers.provider.getBlock(blockNumber);

    const inf1 = await ts.getRecordOwnerInfo(
      recordId,
      signers[0].address.toLowerCase()
    );
    expect(inf1.notBefore).to.equal(blockTs.timestamp);
    expect(inf1.notAfter).to.equal(0);
    expect(inf1.revoked).to.be.false;

    // add ownerdIds and revoke some
    const notBefore = new Date().getTime();
    const notAfter = notBefore + 1000000;
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const inf2 = await ts.getRecordOwnerInfo(recordId, "anotherownerId");
    expect(inf2.notBefore).to.equal(notBefore);
    expect(inf2.notAfter).to.equal(notAfter);
    expect(inf2.revoked).to.be.false;

    // revoke the second owner
    await ts.revokeRecordOwner(recordId, "anotherownerId");
    const inf3 = await ts.getRecordOwnerInfo(recordId, "anotherownerId");
    expect(inf3.notBefore).to.equal(notBefore);
    expect(inf3.notAfter).to.equal(notAfter);
    expect(inf3.revoked).to.be.true;

    // revoke the first owner warning ownerId is case sensitive
    await ts.revokeRecordOwner(recordId, signers[0].address.toLowerCase());
    const inf4 = await ts.getRecordOwnerInfo(
      recordId,
      signers[0].address.toLowerCase()
    );
    expect(inf4.notBefore).to.equal(blockTs.timestamp);
    expect(inf4.notAfter).to.equal(0);
    expect(inf4.revoked).to.be.true;

    // make sure we can add the one owner even if there is none and it was a previous owner
    await ts.insertRecordOwner(recordId, "anotherownerId", notBefore, notAfter);
    const inf5 = await ts.getRecordOwnerInfo(recordId, "anotherownerId");
    expect(inf5.notBefore).to.equal(notBefore);
    expect(inf5.notAfter).to.equal(notAfter);
    expect(inf5.revoked).to.be.false;
  });
});
