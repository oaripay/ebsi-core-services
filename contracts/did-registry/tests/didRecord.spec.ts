import { ethers, network } from "hardhat";

import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import type { DidRegistry, PolicyRegistryMock } from "../src/types";

import { testTprAddress } from "./testAddress";

describe("Record Hashes", () => {
  let ts: DidRegistry;
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  before(async () => {
    [admin, user, user2] = await ethers.getSigners();
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();

    const bytecode = await ethers.provider.getCode(
      await tempPolicyContract.getAddress(),
    );
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    const policyContractMock = policyRegistryFactory.attach(
      testTprAddress,
    ) as PolicyRegistryMock;
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
        Pagination: await paginationLib.getAddress(),
      },
    });
    const didRecordLib = await didRecordFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        DidRecordLib: await didRecordLib.getAddress(),
        DidTimestampLib: await didTimestampLib.getAddress(),
        HashAlgoLib: await hashAlgoLib.getAddress(),
      },
    });

    ts = await contractFactory.deploy(testTprAddress);

    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(await ts.getAddress()).to.be.properAddress;

    // add hashAlgo
    await ts.insertHashAlgorithm(256, "sha-256", "oid", 1, "sha2-256");
    await ts.insertHashAlgorithm(512, "sha-512", "oid2", 1, "sha2-512");
    await ts.insertHashAlgorithm(256, "sha3-256", "oid3", 1, "sha3-256");
  });

  it("insertDidDocument should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));

    await expect(
      ts.insertDidDocument(
        ethers.toUtf8Bytes("did"),
        0,
        hashValue,
        new Uint8Array(),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("didVersionInfo empty");
    await expect(
      ts.insertDidDocument(
        new Uint8Array(),
        0,
        hashValue,
        ethers.toUtf8Bytes("didVersionInfo"),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("identifier empty");

    await ts.insertDidDocument(
      ethers.toUtf8Bytes("did"),
      0,
      hashValue,
      ethers.toUtf8Bytes("didVersionInfo"),
      ethers.toUtf8Bytes("timestampData"),
      ethers.toUtf8Bytes("didVersionMetadata"),
    );
    await expect(
      ts.insertDidDocument(
        ethers.toUtf8Bytes("did"),
        0,
        ethers.sha256(ethers.toUtf8Bytes("e406s05e6")),
        ethers.toUtf8Bytes("didVersionInfo"),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("record exists");
  });

  it("insertDidDocument should fail for unknown hash algo", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    await expect(
      ts.insertDidDocument(
        ethers.toUtf8Bytes("did"),
        7,
        hashValue,
        ethers.toUtf8Bytes("didVersionInfo"),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("hashAlgo unknown");
  });

  it("insertDidDocument should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));
    const didPrime = ethers.toUtf8Bytes("didPrime");
    const tsIdPrime = ethers.sha256(hash1Prime);
    const recIdPrime = ethers.sha256(didPrime);
    await expect(
      ts.insertDidDocument(
        didPrime,
        0,
        hash1Prime,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recIdPrime,
        tsIdPrime,
        ethers.sha256(didVersionInfo),
        ethers.sha256(new Uint8Array()),
      );
  });

  it("insertDidDocument should succeed with empty data", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);

    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(new Uint8Array()),
      );
  });

  it("updateDidDocument should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );
    await expect(
      ts.updateDidDocument(
        ethers.toUtf8Bytes("did"),
        0,
        ethers.sha256(ethers.toUtf8Bytes("e406s05ssse6")),
        new Uint8Array(),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("didVersionInfo empty");
    await expect(
      ts.updateDidDocument(
        new Uint8Array(),
        0,
        ethers.sha256(ethers.toUtf8Bytes("e4sqqs06s05e6")),
        ethers.toUtf8Bytes("didVersionInfo"),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("identifier empty");

    await ts.updateDidDocument(
      ethers.toUtf8Bytes("did"),
      0,
      ethers.sha256(ethers.toUtf8Bytes("aae406s05e6")),
      ethers.toUtf8Bytes("didVersionInfo"),
      ethers.toUtf8Bytes("timestampData"),
      ethers.toUtf8Bytes("didVersionMetadata"),
    );

    await expect(
      ts.insertDidDocument(
        ethers.toUtf8Bytes("did"),
        0,
        ethers.sha256(ethers.toUtf8Bytes("e406s05e6")),
        ethers.toUtf8Bytes("didVersionInfo"),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("record exists");
  });

  it("updateDidDocument should fail for unknown hash algo", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );
    await expect(
      ts.updateDidDocument(
        ethers.toUtf8Bytes("did"),
        7,
        hashValue,
        ethers.toUtf8Bytes("didVersionInfo"),
        ethers.toUtf8Bytes("timestampData"),
        ethers.toUtf8Bytes("didVersionMetadata"),
      ),
    ).to.be.revertedWith("hashAlgo unknown");
  });

  it("updateDidDocument should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));
    const tsIdPrime = ethers.sha256(hash1Prime);

    await expect(
      ts.updateDidDocument(
        did,
        0,
        hash1Prime,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      ),
    )
      .to.emit(ts, "DidDocumentUpdated")
      .withArgs(
        recId,
        tsIdPrime,
        ethers.sha256(didVersionInfo),
        ethers.sha256(new Uint8Array()),
      );
  });

  it("updateDidDocument should succeed with empty data", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);

    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(new Uint8Array()),
      );

    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));
    const tsIdPrime = ethers.sha256(hash1Prime);
    await expect(
      ts.updateDidDocument(
        did,
        0,
        hash1Prime,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      ),
    )
      .to.emit(ts, "DidDocumentUpdated")
      .withArgs(
        recId,
        tsIdPrime,
        ethers.sha256(didVersionInfo),
        ethers.sha256(new Uint8Array()),
      );
  });

  it("insertDidController should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");

    expect(
      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    );

    const newControllerId = user.address;

    await expect(
      ts.insertDidController(new Uint8Array(), newControllerId, 1, 2),
    ).to.be.revertedWith("identifier empty");

    await expect(
      ts.insertDidController(
        ethers.toUtf8Bytes("nodid"),
        newControllerId,
        1,
        2,
      ),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.connect(user2).insertDidController(did, newControllerId, 1, 2),
    ).to.be.revertedWith("ctrl unknown");

    await ts.insertDidController(did, newControllerId, 1, 2);
    await ts.insertDidController(did, user2.address, 1, 2);
    await ts.connect(user).revokeDidController(did, admin.address);

    await expect(
      ts.insertDidController(did, newControllerId, 1, 2),
    ).to.be.revertedWith("ctrl unknown");
  });

  it("insertDidController should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );

    const newControllerId = user.address;

    await expect(ts.insertDidController(did, newControllerId, 1, 2))
      .to.emit(ts, "DidControllerInserted")
      .withArgs(recId, newControllerId, admin.address, 1, 2);
  });

  it("updateDidController should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");

    expect(
      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    );

    const newControllerId = user.address;

    await expect(
      ts.updateDidController(new Uint8Array(), newControllerId, 1, 2),
    ).to.be.revertedWith("identifier empty");

    await expect(
      ts.updateDidController(
        ethers.toUtf8Bytes("nodid"),
        newControllerId,
        1,
        2,
      ),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.connect(user2).updateDidController(did, newControllerId, 1, 2),
    ).to.be.revertedWith("ctrl unknown");
  });

  it("updateDidController should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );

    const newControllerId = user.address;

    await expect(ts.updateDidController(did, newControllerId, 1, 2))
      .to.emit(ts, "DidControllerUpdated")
      .withArgs(recId, newControllerId, admin.address, 1, 2);
  });

  it("revokeDidController should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");

    expect(
      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    );

    const newControllerId = user.address;

    await expect(
      ts.revokeDidController(did, newControllerId),
    ).to.be.revertedWith("msg.sender is last ctrl");

    await expect(
      ts.revokeDidController(new Uint8Array(), newControllerId),
    ).to.be.revertedWith("identifier empty");

    await expect(
      ts.revokeDidController(ethers.toUtf8Bytes("nodid"), newControllerId),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.connect(user2).revokeDidController(did, newControllerId),
    ).to.be.revertedWith("ctrl unknown");
  });

  it("revokeDidController should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const newControllerId = user.address;
    await ts.insertDidController(did, newControllerId, 1, 2);

    await expect(ts.revokeDidController(did, newControllerId))
      .to.emit(ts, "DidRecordOwnerRevoked")
      .withArgs(recId, newControllerId, admin.address);
  });

  it("revokeDidController should succeed after a controller update", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const newControllerId = user.address;
    await ts.insertDidController(did, newControllerId, 1, 2);
    // update to the same should work
    await expect(
      ts.connect(user).updateDidController(did, newControllerId, 1, 2),
    )
      .to.emit(ts, "DidControllerUpdated")
      .withArgs(recId, newControllerId, user.address, 1, 2);

    await expect(ts.revokeDidController(did, newControllerId))
      .to.emit(ts, "DidRecordOwnerRevoked")
      .withArgs(recId, newControllerId, admin.address);
  });

  it("appendDidDocumentVersionHash should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));

    const didVersionInfoPrime = ethers.toUtf8Bytes("didVersionInfoPrime");

    await expect(
      ts.appendDidDocumentVersionHash(
        did,
        0,
        hash1Prime,
        new Uint8Array(),
        didVersionInfoPrime,
      ),
    ).to.be.revertedWith("versionInfo unknown");

    await expect(
      ts.appendDidDocumentVersionHash(
        new Uint8Array(),
        0,
        hash1Prime,
        new Uint8Array(),
        didVersionInfo,
      ),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.appendDidDocumentVersionHash(
        did,
        0,
        hash1Prime,
        new Uint8Array(),
        new Uint8Array(),
      ),
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.appendDidDocumentVersionHash(
        ethers.toUtf8Bytes("unknown"),
        0,
        hash1Prime,
        new Uint8Array(),
        didVersionInfo,
      ),
    ).to.be.revertedWith("record unknown");

    await expect(
      ts
        .connect(user2)
        .appendDidDocumentVersionHash(
          did,
          0,
          hash1Prime,
          new Uint8Array(),
          didVersionInfo,
        ),
    ).to.be.revertedWith("ctrl unknown");
  });

  it("appendDidDocumentVersionHash should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));
    const tsIdPrime = ethers.sha256(hash1Prime);
    await expect(
      ts.appendDidDocumentVersionHash(
        did,
        0,
        hash1Prime,
        new Uint8Array(),
        didVersionInfo,
      ),
    )
      .to.emit(ts, "DidDocumentVersionHashAppended")
      .withArgs(recId, tsIdPrime, ethers.hexlify(didVersionInfo));
  });

  it("detachDidDocumentVersionHash should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));

    await expect(
      ts.detachDidDocumentVersionHash(
        new Uint8Array(),
        0,
        hash1Prime,
        didVersionInfo,
      ),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.detachDidDocumentVersionHash(did, 0, hash1Prime, new Uint8Array()),
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.detachDidDocumentVersionHash(
        ethers.toUtf8Bytes("unknown"),
        0,
        ethers.toUtf8Bytes("othere40605e6"),
        didVersionInfo,
      ),
    ).to.be.revertedWith("invalid hash length");

    await expect(
      ts.detachDidDocumentVersionHash(
        ethers.toUtf8Bytes("unknown"),
        0,
        hash1Prime,
        didVersionInfo,
      ),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.detachDidDocumentVersionHash(
        did,
        0,
        ethers.sha256(ethers.toUtf8Bytes("unknown")),

        didVersionInfo,
      ),
    ).to.be.revertedWith("hash unknown");
    await expect(
      ts
        .connect(user2)
        .detachDidDocumentVersionHash(did, 0, hash1Prime, didVersionInfo),
    ).to.be.revertedWith("ctrl unknown");

    await expect(
      ts.detachDidDocumentVersionHash(did, 0, hashValue, didVersionInfo),
    ).to.be.revertedWith("last tsId");
  });

  it("detachDidDocumentVersionHash should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes("othere40605e6"));
    const tsIdPrime = ethers.sha256(hash1Prime);
    await expect(
      ts.appendDidDocumentVersionHash(
        did,
        0,
        hash1Prime,
        new Uint8Array(),
        didVersionInfo,
      ),
    )
      .to.emit(ts, "DidDocumentVersionHashAppended")
      .withArgs(recId, tsIdPrime, ethers.hexlify(didVersionInfo));

    await expect(
      ts.detachDidDocumentVersionHash(did, 0, hashValue, didVersionInfo),
    )
      .to.emit(ts, "DidDocumentVersionHashDetached")
      .withArgs(
        recId,
        ethers.hexlify(hashValue),
        ethers.hexlify(didVersionInfo),
      );
  });

  it("appendDidDocumentVersionMetadata should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    const didVersionInfoPrime = ethers.toUtf8Bytes("didVersionInfoPrime");
    const didVersionMetadataPrime = ethers.toUtf8Bytes("didVersionMetadata");

    await expect(
      ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfoPrime,
        didVersionMetadataPrime,
      ),
    ).to.be.revertedWith("versionInfo unknown");

    await expect(
      ts.appendDidDocumentVersionMetadata(
        new Uint8Array(),
        didVersionInfo,
        didVersionMetadata,
      ),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.appendDidDocumentVersionMetadata(
        did,
        new Uint8Array(),
        didVersionMetadata,
      ),
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.appendDidDocumentVersionMetadata(
        ethers.toUtf8Bytes("unknown"),
        didVersionInfo,
        didVersionMetadata,
      ),
    ).to.be.revertedWith("record unknown");

    await expect(
      ts
        .connect(user2)
        .appendDidDocumentVersionMetadata(
          did,
          didVersionInfo,
          didVersionMetadataPrime,
        ),
    ).to.be.revertedWith("ctrl unknown");
  });

  it("appendDidDocumentVersionMetadata should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    const didVersionMetadataPrime = ethers.toUtf8Bytes("didVersionMetadata");

    await expect(
      ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo,
        didVersionMetadataPrime,
      ),
    )
      .to.emit(ts, "DidDocumentVersionMetadataAppended")
      .withArgs(
        recId,
        ethers.hexlify(didVersionMetadataPrime),
        ethers.hexlify(didVersionInfo),
      );
  });

  it("detachDidDocumentVersionMetadata should fail for incorrect inputs", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    await expect(
      ts.detachDidDocumentVersionMetadata(
        new Uint8Array(),
        didVersionInfo,
        didVersionMetadata,
      ),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.detachDidDocumentVersionMetadata(
        did,
        new Uint8Array(),
        didVersionMetadata,
      ),
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.detachDidDocumentVersionMetadata(
        ethers.toUtf8Bytes("unknown"),
        didVersionInfo,
        didVersionMetadata,
      ),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.detachDidDocumentVersionMetadata(
        did,
        ethers.toUtf8Bytes("unknown"),

        didVersionInfo,
      ),
    ).to.be.revertedWith("versionInfo unknown");
    await expect(
      ts
        .connect(user2)
        .detachDidDocumentVersionMetadata(
          did,
          didVersionInfo,
          didVersionMetadata,
        ),
    ).to.be.revertedWith("ctrl unknown");
  });

  it("detachDidDocumentVersionMetadata should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const tsId = ethers.sha256(hashValue);
    const recId = ethers.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.sha256(didVersionInfo),
        ethers.sha256(didVersionMetadata),
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    await expect(
      ts.detachDidDocumentVersionMetadata(
        did,
        didVersionInfo,
        didVersionMetadata,
      ),
    )
      .to.emit(ts, "DidDocumentVersionMetadataDetached")
      .withArgs(
        recId,
        ethers.hexlify(didVersionMetadata),
        ethers.hexlify(didVersionInfo),
      );
  });

  it("getDidRecordIdentifiers should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );

    // pagesize = 0 should revert
    await expect(ts.getDidRecordIdentifiers(1, 0)).to.be.revertedWith(
      "PSize not >0",
    );
    // page  = 0 should revert
    await expect(ts.getDidRecordIdentifiers(0, 10)).to.be.revertedWith(
      "Page not >0",
    );

    // pagesize > 50 should revert
    await expect(ts.getDidRecordIdentifiers(1, 51)).to.be.revertedWith(
      "PSize not <= 50",
    );
  });

  it("getDidRecordIdentifiers should succeed", async () => {
    const dids: string[] = [];
    const tsIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash-${i}`));
      const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo-${i}`);
      const timestampData = ethers.toUtf8Bytes(`timestampData-${i}`);
      const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata-${i}`);
      const did = ethers.toUtf8Bytes(`did-${i}`);
      const tsId = ethers.sha256(hashValue);

      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata,
      );
      dids.push(ethers.hexlify(did));
      tsIds.push(tsId);
    }

    const r0 = await ts.getDidRecordIdentifiers(1, 1);
    expect(r0.items).to.deep.equal(dids.slice(0, 1));

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidRecordIdentifiers(1, 11);
    expect(r.items).to.deep.equal(dids);

    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidRecordIdentifiers(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getDidRecordIdentifiersByControllerId should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const ctrlId = admin.address;
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );

    await ts.insertDidController(did, ctrlId, 1, 2);

    // pagesize = 0 should revert
    await expect(
      ts.getDidRecordIdentifiersByControllerId(ctrlId, 1, 0),
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getDidRecordIdentifiersByControllerId(ctrlId, 0, 10),
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getDidRecordIdentifiersByControllerId(ctrlId, 1, 51),
    ).to.be.revertedWith("PSize not <= 50");
  });

  it("getDidRecordIdentifiersByControllerId should succeed", async () => {
    const dids: string[] = [];
    const ctrlId = admin.address;
    for (let i = 1; i < 12; i += 1) {
      const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash-${i}`));
      const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo-${i}`);
      const timestampData = ethers.toUtf8Bytes(`timestampData-${i}`);

      const did = ethers.toUtf8Bytes(`did-${i}`);

      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        new Uint8Array(),
      );

      dids.push(ethers.hexlify(did));
    }

    const r0 = await ts.getDidRecordIdentifiersByControllerId(ctrlId, 1, 1);
    expect(r0.items).to.deep.equal(dids.slice(0, 1));

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidRecordIdentifiersByControllerId(ctrlId, 1, 11);
    expect(r.items).to.deep.equal(dids);

    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidRecordIdsByControllerId(ctrlId, 5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getDidRecordIdsByControllerId should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    const ctrlId = admin.address;
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );

    await ts.insertDidController(did, ctrlId, 1, 2);

    // pagesize = 0 should revert
    await expect(
      ts.getDidRecordIdsByControllerId(ctrlId, 1, 0),
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getDidRecordIdsByControllerId(ctrlId, 0, 10),
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getDidRecordIdsByControllerId(ctrlId, 1, 51),
    ).to.be.revertedWith("PSize not <= 50");
  });

  it("getDidRecordIdsByControllerId should succeed", async () => {
    const dids: string[] = [];
    const ctrlId = admin.address;
    for (let i = 1; i < 12; i += 1) {
      const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash-${i}`));
      const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo-${i}`);
      const timestampData = ethers.toUtf8Bytes(`timestampData-${i}`);

      const did = ethers.toUtf8Bytes(`did-${i}`);

      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        new Uint8Array(),
      );

      dids.push(ethers.sha256(did));
    }

    const r0 = await ts.getDidRecordIdsByControllerId(ctrlId, 1, 1);
    expect(r0.items).to.deep.equal(dids.slice(0, 1));

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidRecordIdsByControllerId(ctrlId, 1, 11);
    expect(r.items).to.deep.equal(dids);

    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidRecordIdsByControllerId(ctrlId, 5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getLatestDidDocumentVersion should fail with wrong input parameters", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );
    await expect(
      ts.getLatestDidDocumentVersion(new Uint8Array()),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.getLatestDidDocumentVersion(ethers.toUtf8Bytes("unknown")),
    ).to.be.revertedWith("record unknown");
  });

  it("getLatestDidDocumentVersion should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata,
    );
    const r0 = await ts.getLatestDidDocumentVersion(did);
    expect(r0).to.equal(ethers.hexlify(didVersionInfo1));

    const didVersionInfos: string[] = [];
    didVersionInfos.push(ethers.sha256(didVersionInfo1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo-${i}`);
      const hash1Prime = ethers.sha256(ethers.toUtf8Bytes(`hashPrime-${i}`));
      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.updateDidDocument(
        did,
        0,
        hash1Prime,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      );

      const r = await ts.getLatestDidDocumentVersion(did);
      expect(r).to.equal(ethers.hexlify(didVersionInfo));
      didVersionInfos.push(ethers.hexlify(didVersionInfo));
    }
    const rlast = await ts.getLatestDidDocumentVersion(did);
    expect(rlast).to.equal(didVersionInfos.pop());
  });

  it("getDidRecord should fail with wrong input parameters", async () => {
    await expect(ts.getDidRecord(new Uint8Array())).to.be.revertedWith(
      "identifier empty",
    );
    await expect(ts.getDidRecord(ethers.ZeroHash)).to.be.revertedWith(
      "record unknown",
    );
  });

  it("getDidRecord should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.toUtf8Bytes(`did `);
    const recordId = ethers.sha256(did);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );

    const r0 = await ts.getDidRecord(did);
    expect(r0.controllerIds).to.deep.equal([admin.address]);
    expect(r0.totalDidVersions).to.equal(1);

    // add version
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes(`hash1Prime `));
    await ts.updateDidDocument(
      did,
      0,
      hash1Prime,
      didVersionInfo,
      new Uint8Array(),
      new Uint8Array(),
    );
    // add controller
    const newControllerId = user.address;

    await expect(ts.insertDidController(did, newControllerId, 1, 2))
      .to.emit(ts, "DidControllerInserted")
      .withArgs(recordId, newControllerId, admin.address, 1, 2);

    const r1 = await ts.getDidRecord(did);
    expect(r1.controllerIds).to.deep.equal([admin.address, newControllerId]);
    expect(r1.totalDidVersions).to.equal(2);
  });

  it("getDidRecordById should fail with wrong input parameters", async () => {
    await expect(ts.getDidRecordById(ethers.ZeroHash)).to.be.revertedWith(
      "recordId empty",
    );
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    await expect(ts.getDidRecordById(hashValue)).to.be.revertedWith(
      "record unknown",
    );
  });

  it("getDidRecordById should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.toUtf8Bytes(`did `);
    const recordId = ethers.sha256(did);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );

    const r0 = await ts.getDidRecordById(recordId);
    expect(r0.controllerIds).to.deep.equal([admin.address]);
    expect(r0.totalDidVersions).to.equal(1);

    // add version
    const hash1Prime = ethers.sha256(ethers.toUtf8Bytes(`hash1Prime `));
    await ts.updateDidDocument(
      did,
      0,
      hash1Prime,
      didVersionInfo,
      new Uint8Array(),
      new Uint8Array(),
    );
    // add controller
    const newControllerId = user.address;

    await expect(ts.insertDidController(did, newControllerId, 1, 2))
      .to.emit(ts, "DidControllerInserted")
      .withArgs(recordId, newControllerId, admin.address, 1, 2);

    const r1 = await ts.getDidRecordById(recordId);
    expect(r1.controllerIds).to.deep.equal([admin.address, newControllerId]);
    expect(r1.totalDidVersions).to.equal(2);
  });

  it("getDidDocumentVersionIds should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );
    await expect(
      ts.getDidDocumentVersionIds(new Uint8Array(), 1, 10),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.getDidDocumentVersionIds(ethers.toUtf8Bytes("unknown"), 1, 10),
    ).to.be.revertedWith("record unknown");
    // pagesize = 0 should revert
    await expect(ts.getDidDocumentVersionIds(did, 1, 0)).to.be.revertedWith(
      "PSize not >0",
    );
    // page  = 0 should revert
    await expect(ts.getDidDocumentVersionIds(did, 0, 10)).to.be.revertedWith(
      "Page not >0",
    );

    // pagesize > 50 should revert
    await expect(ts.getDidDocumentVersionIds(did, 1, 51)).to.be.revertedWith(
      "PSize not <= 50",
    );
  });

  it("getDidDocumentVersionIds should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata,
    );

    const didVersionInfoIds: string[] = [];
    didVersionInfoIds.push(ethers.sha256(didVersionInfo1));

    for (let i = 1; i < 11; i += 1) {
      const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo-${i}`);
      const hash1Prime = ethers.sha256(ethers.toUtf8Bytes(`hashPrime-${i}`));
      const didVersionInfoId = ethers.sha256(didVersionInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.updateDidDocument(
        did,
        0,
        hash1Prime,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      );

      didVersionInfoIds.push(didVersionInfoId);
    }

    const r0 = await ts.getDidDocumentVersionIds(did, 1, 1);
    expect(r0.items).to.deep.equal(didVersionInfoIds.slice(0, 1));

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidDocumentVersionIds(did, 1, 11);
    expect(r.items).to.deep.equal(didVersionInfoIds);

    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidDocumentVersionIds(did, 5, 11);
    expect(r1.items).to.deep.equal([]);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getDidDocumentVersionInfo should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata,
    );
    const didVersionInfoIds: string[] = [];
    const didVersionInfos: string[] = [];
    didVersionInfoIds.push(ethers.sha256(didVersionInfo1));
    didVersionInfos.push(ethers.hexlify(didVersionInfo1));

    for (let i = 1; i < 11; i += 1) {
      const didVersionInfo = ethers.toUtf8Bytes(`didVersionInfo-${i}`);
      const hash1Prime = ethers.sha256(ethers.toUtf8Bytes(`hashPrime-${i}`));
      const didVersionInfoId = ethers.sha256(didVersionInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.updateDidDocument(
        did,
        0,
        hash1Prime,
        didVersionInfo,
        new Uint8Array(),
        new Uint8Array(),
      );

      didVersionInfoIds.push(didVersionInfoId);
      didVersionInfos.push(ethers.hexlify(didVersionInfo));
    }

    for (const [id, el] of didVersionInfoIds.entries()) {
      const rlast = await ts.getDidDocumentVersionInfo(el);
      expect(rlast).to.equal(didVersionInfos[id]);
    }
  });

  it("getDidDocumentVersionMetadata should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata,
    );
    const didVersionMetadataIds: string[] = [];
    const didVersionMetadatas: string[] = [];
    didVersionMetadataIds.push(ethers.sha256(didVersionMetadata));
    didVersionMetadatas.push(ethers.hexlify(didVersionMetadata));

    for (let i = 1; i < 11; i += 1) {
      const didVersionMdata = ethers.toUtf8Bytes(`didVersionMetadata-${i}`);

      const didVersionMetadataId = ethers.sha256(didVersionMdata);
      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo1,
        didVersionMdata,
      );
      didVersionMetadatas.push(ethers.hexlify(didVersionMdata));
      didVersionMetadataIds.push(didVersionMetadataId);
    }

    for (const [id, el] of didVersionMetadataIds.entries()) {
      const rlast = await ts.getDidDocumentVersionMetadata(el);
      expect(rlast).to.equal(didVersionMetadatas[id]);
    }
  });

  it("getDidDocumentVersionMetadataIds should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did");

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );
    const didVersionInfoId = ethers.sha256(didVersionInfo);
    await expect(
      ts.getDidDocumentVersionMetadataIds(
        new Uint8Array(),
        didVersionInfoId,
        1,
        10,
      ),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, ethers.ZeroHash, 1, 10),
    ).to.be.revertedWith("versionInfoId empty");
    await expect(
      ts.getDidDocumentVersionMetadataIds(
        ethers.toUtf8Bytes("unknown"),
        didVersionInfoId,
        1,
        10,
      ),
    ).to.be.revertedWith("record unknown");
    // pagesize = 0 should revert
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, didVersionInfoId, 1, 0),
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, didVersionInfoId, 0, 10),
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, didVersionInfoId, 1, 51),
    ).to.be.revertedWith("PSize not <= 50");
  });

  it("getDidDocumentVersionMetadataIds should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.sha256(didVersionInfo1);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata1 = ethers.toUtf8Bytes(`didVersionMetadatainit `);
    const did = ethers.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata1,
    );

    const didVersionMetadataIds: string[] = [];
    didVersionMetadataIds.push(ethers.sha256(didVersionMetadata1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata-${i}`);

      const didVersionMetadataId = ethers.sha256(didVersionMetadata);
      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo1,
        didVersionMetadata,
      );

      didVersionMetadataIds.push(didVersionMetadataId);
    }

    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1,
    );
    expect(r0.items).to.deep.equal(didVersionMetadataIds.slice(0, 1));

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      11,
    );
    expect(r.items).to.deep.equal(didVersionMetadataIds);

    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      5,
      11,
    );
    expect(r1.items).to.deep.equal([]);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getDidDocumentVersionMetadataIds should succeed with empty metadata (new Uint8Array())", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.sha256(didVersionInfo1);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const did = ethers.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      new Uint8Array(), // empty metadata
    );

    // It should return an empty list
    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1,
    );

    expect(r0.items).to.deep.equal([]);
    expect(r0.total).to.equal(0);
    expect(r0.howMany).to.equal(0);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(1);
  });

  it("getDidDocumentVersionMetadataIds should succeed with empty metadata (0x)", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.sha256(didVersionInfo1);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const did = ethers.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      "0x", // empty metadata
    );

    // It should return an empty list
    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1,
    );

    expect(r0.items).to.deep.equal([]);
    expect(r0.total).to.equal(0);
    expect(r0.howMany).to.equal(0);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(1);
  });

  it("getDidDocumentVersionMetadataIds should succeed with empty metadata (new Uint8Array())", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.sha256(didVersionInfo1);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const did = ethers.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      new Uint8Array(),
    );

    // It should return an empty list
    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1,
    );

    expect(r0.items).to.deep.equal([]);
    expect(r0.total).to.equal(0);
    expect(r0.howMany).to.equal(0);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(1);
  });

  it("getDidDocumentVersionDidTimestampIds should succeed", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.toUtf8Bytes(`didVersionInfo1`);
    const timestampId = ethers.sha256(hashValue);
    const timestampData = ethers.toUtf8Bytes(`timestampData `);
    const didVersionMetadata1 = ethers.toUtf8Bytes(`didVersionMetadatainit `);
    const did = ethers.toUtf8Bytes(`did `);
    const did1 = ethers.toUtf8Bytes(`did1 `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata1,
    );

    const didVersionMetadataIds: string[] = [];
    didVersionMetadataIds.push(ethers.sha256(didVersionMetadata1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionMetadata = ethers.toUtf8Bytes(`didVersionMetadata-${i}`);

      const didVersionMetadataId = ethers.sha256(didVersionMetadata);
      // INSERT SHOULD BE DONE IN ORDER !!!

      await ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo1,
        didVersionMetadata,
      );

      didVersionMetadataIds.push(didVersionMetadataId);
    }
    const didVersionIds = await ts.getDidDocumentVersionDidTimestampIds(did, 1);
    expect(didVersionIds).to.deep.equal([timestampId]);
    await expect(
      ts.getDidDocumentVersionDidTimestampIds(new Uint8Array(), 1),
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.getDidDocumentVersionDidTimestampIds(did1, 2),
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.getDidDocumentVersionDidTimestampIds(did, 2),
    ).to.be.revertedWith("unknown version");
  });

  it("should check if an address is a did controller", async () => {
    const hashValue = ethers.sha256(ethers.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.toUtf8Bytes("didVersionMetadata");
    const did = ethers.toUtf8Bytes("did:ebsi:abc");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata,
    );
    expect(await ts.checkController(did, admin.address)).to.equal(true);
    expect(await ts.checkController(did, user.address)).to.equal(false);
  });
});
