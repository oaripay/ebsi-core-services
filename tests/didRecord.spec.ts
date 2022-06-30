import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { DidRegistry } from "../src/types";
import { testTprAddress } from "./testAddress";
import { contractFactoryPagination } from "./contractFactories";

describe("Record Hashes", () => {
  let ts: DidRegistry;
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  before(async () => {
    [admin, user, user2] = await ethers.getSigners();
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    const policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);
  });

  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory(
      contractFactoryPagination,
      {}
    );
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

    const policyFactory = await ethers.getContractFactory("DidPolicyLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const policyLib = await policyFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        HashAlgoLib: hashAlgoLib.address,
        DidTimestampLib: didTimestampLib.address,
        DidRecordLib: didRecordLib.address,
        DidPolicyLib: policyLib.address,
      },
    });

    ts = (await contractFactory.deploy()) as DidRegistry;

    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.be.properAddress;

    // add hashAlgo
    await ts.insertHashAlgorithm(256, "sha-256", "oid", 1, "sha2-256");
    await ts.insertHashAlgorithm(512, "sha-512", "oid2", 1, "sha2-512");
    await ts.insertHashAlgorithm(256, "sha3-256", "oid3", 1, "sha3-256");
  });

  it("insertDidDocument should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));

    await expect(
      ts.insertDidDocument(
        ethers.utils.toUtf8Bytes("did"),
        0,
        hashValue,
        [],
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("didVersionInfo empty");
    await expect(
      ts.insertDidDocument(
        [],
        0,
        hashValue,
        ethers.utils.toUtf8Bytes("didVersionInfo"),
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("identifier empty");

    ts.insertDidDocument(
      ethers.utils.toUtf8Bytes("did"),
      0,
      hashValue,
      ethers.utils.toUtf8Bytes("didVersionInfo"),
      ethers.utils.toUtf8Bytes("timestampData"),
      ethers.utils.toUtf8Bytes("didVersionMetadata")
    );
    await expect(
      ts.insertDidDocument(
        ethers.utils.toUtf8Bytes("did"),
        0,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("e406s05e6")),
        ethers.utils.toUtf8Bytes("didVersionInfo"),
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("record exists");
  });

  it("insertDidDocument should fail for unknown hash algo", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    await expect(
      ts.insertDidDocument(
        ethers.utils.toUtf8Bytes("did"),
        7,
        hashValue,
        ethers.utils.toUtf8Bytes("didVersionInfo"),
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("hashAlgo unknown");
  });

  it("insertDidDocument should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );
    const didPrime = ethers.utils.toUtf8Bytes("didPrime");
    const tsIdPrime = ethers.utils.sha256(hash1Prime);
    const recIdPrime = ethers.utils.sha256(didPrime);
    await expect(
      ts.insertDidDocument(didPrime, 0, hash1Prime, didVersionInfo, [], [])
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recIdPrime,
        tsIdPrime,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256([])
      );
  });

  it("insertDidDocument should succeed with empty data", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);

    await expect(
      ts.insertDidDocument(did, 0, hashValue, didVersionInfo, [], [])
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256([])
      );
  });

  it("updateDidDocument should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );
    await expect(
      ts.updateDidDocument(
        ethers.utils.toUtf8Bytes("did"),
        0,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("e406s05ssse6")),
        [],
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("didVersionInfo empty");
    await expect(
      ts.updateDidDocument(
        [],
        0,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("e4sqqs06s05e6")),
        ethers.utils.toUtf8Bytes("didVersionInfo"),
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("identifier empty");

    ts.updateDidDocument(
      ethers.utils.toUtf8Bytes("did"),
      0,
      ethers.utils.sha256(ethers.utils.toUtf8Bytes("aae406s05e6")),
      ethers.utils.toUtf8Bytes("didVersionInfo"),
      ethers.utils.toUtf8Bytes("timestampData"),
      ethers.utils.toUtf8Bytes("didVersionMetadata")
    );
    await expect(
      ts.insertDidDocument(
        ethers.utils.toUtf8Bytes("did"),
        0,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("e406s05e6")),
        ethers.utils.toUtf8Bytes("didVersionInfo"),
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("record exists");
  });

  it("updateDidDocument should fail for unknown hash algo", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );
    await expect(
      ts.updateDidDocument(
        ethers.utils.toUtf8Bytes("did"),
        7,
        hashValue,
        ethers.utils.toUtf8Bytes("didVersionInfo"),
        ethers.utils.toUtf8Bytes("timestampData"),
        ethers.utils.toUtf8Bytes("didVersionMetadata")
      )
    ).to.be.revertedWith("hashAlgo unknown");
  });

  it("updateDidDocument should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );
    const tsIdPrime = ethers.utils.sha256(hash1Prime);

    await expect(
      ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], [])
    )
      .to.emit(ts, "DidDocumentUpdated")
      .withArgs(
        recId,
        tsIdPrime,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256([])
      );
  });

  it("updateDidDocument should succeed with empty data", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);

    await expect(
      ts.insertDidDocument(did, 0, hashValue, didVersionInfo, [], [])
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256([])
      );

    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );
    const tsIdPrime = ethers.utils.sha256(hash1Prime);
    await expect(
      ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], [])
    )
      .to.emit(ts, "DidDocumentUpdated")
      .withArgs(
        recId,
        tsIdPrime,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256([])
      );
  });

  it("insertDidController should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");

    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    );

    const newControllerId = user.address;

    await expect(
      ts.insertDidController([], newControllerId, 1, 2)
    ).to.be.revertedWith("identifier empty");

    await expect(
      ts.insertDidController(
        ethers.utils.toUtf8Bytes("nodid"),
        newControllerId,
        1,
        2
      )
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.connect(user2).insertDidController(did, newControllerId, 1, 2)
    ).to.be.revertedWith("ctrl unknown");

    await ts.insertDidController(did, newControllerId, 1, 2);
    await ts.insertDidController(did, user2.address, 1, 2);
    await ts.connect(user).revokeDidController(did, admin.address);

    await expect(
      ts.insertDidController(did, newControllerId, 1, 2)
    ).to.be.revertedWith("ctrl unknown");
  });

  it("insertDidController should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );

    const newControllerId = user.address;

    await expect(ts.insertDidController(did, newControllerId, 1, 2))
      .to.emit(ts, "DidControllerInserted")
      .withArgs(recId, newControllerId, admin.address, 1, 2);
  });

  it("updateDidController should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");

    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    );

    const newControllerId = user.address;

    await expect(
      ts.updateDidController([], newControllerId, 1, 2)
    ).to.be.revertedWith("identifier empty");

    await expect(
      ts.updateDidController(
        ethers.utils.toUtf8Bytes("nodid"),
        newControllerId,
        1,
        2
      )
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.connect(user2).updateDidController(did, newControllerId, 1, 2)
    ).to.be.revertedWith("ctrl unknown");
  });

  it("updateDidController should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );

    const newControllerId = user.address;

    await expect(ts.updateDidController(did, newControllerId, 1, 2))
      .to.emit(ts, "DidControllerUpdated")
      .withArgs(recId, newControllerId, admin.address, 1, 2);
  });

  it("revokeDidController should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");

    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    );

    const newControllerId = user.address;

    await expect(
      ts.revokeDidController(did, newControllerId)
    ).to.be.revertedWith("msg.sender is last ctrl");

    await expect(
      ts.revokeDidController([], newControllerId)
    ).to.be.revertedWith("identifier empty");

    await expect(
      ts.revokeDidController(ethers.utils.toUtf8Bytes("nodid"), newControllerId)
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.connect(user2).revokeDidController(did, newControllerId)
    ).to.be.revertedWith("ctrl unknown");
  });

  it("revokeDidController should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const newControllerId = user.address;
    await ts.insertDidController(did, newControllerId, 1, 2);

    await expect(ts.revokeDidController(did, newControllerId))
      .to.emit(ts, "DidRecordOwnerRevoked")
      .withArgs(recId, newControllerId, admin.address);
  });

  it("revokeDidController should succeed after a controller update", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const newControllerId = user.address;
    await ts.insertDidController(did, newControllerId, 1, 2);
    // update to the same should work
    await expect(
      ts.connect(user).updateDidController(did, newControllerId, 1, 2)
    )
      .to.emit(ts, "DidControllerUpdated")
      .withArgs(recId, newControllerId, user.address, 1, 2);

    await expect(ts.revokeDidController(did, newControllerId))
      .to.emit(ts, "DidRecordOwnerRevoked")
      .withArgs(recId, newControllerId, admin.address);
  });

  it("appendDidDocumentVersionHash should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );

    const didVersionInfoPrime = ethers.utils.toUtf8Bytes("didVersionInfoPrime");

    await expect(
      ts.appendDidDocumentVersionHash(
        did,
        0,
        hash1Prime,
        [],
        didVersionInfoPrime
      )
    ).to.be.revertedWith("versionInfo unknown");

    await expect(
      ts.appendDidDocumentVersionHash([], 0, hash1Prime, [], didVersionInfo)
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.appendDidDocumentVersionHash(did, 0, hash1Prime, [], [])
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.appendDidDocumentVersionHash(
        ethers.utils.toUtf8Bytes("unknown"),
        0,
        hash1Prime,
        [],
        didVersionInfo
      )
    ).to.be.revertedWith("record unknown");

    await expect(
      ts
        .connect(user2)
        .appendDidDocumentVersionHash(did, 0, hash1Prime, [], didVersionInfo)
    ).to.be.revertedWith("ctrl unknown");
  });

  it("appendDidDocumentVersionHash should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );
    const tsIdPrime = ethers.utils.sha256(hash1Prime);
    await expect(
      ts.appendDidDocumentVersionHash(did, 0, hash1Prime, [], didVersionInfo)
    )
      .to.emit(ts, "DidDocumentVersionHashAppended")
      .withArgs(recId, tsIdPrime, ethers.utils.hexlify(didVersionInfo));
  });

  it("detachDidDocumentVersionHash should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );

    await expect(
      ts.detachDidDocumentVersionHash([], 0, hash1Prime, didVersionInfo)
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.detachDidDocumentVersionHash(did, 0, hash1Prime, [])
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.detachDidDocumentVersionHash(
        ethers.utils.toUtf8Bytes("unknown"),
        0,
        ethers.utils.toUtf8Bytes("othere40605e6"),
        didVersionInfo
      )
    ).to.be.revertedWith("invalid hash length");

    await expect(
      ts.detachDidDocumentVersionHash(
        ethers.utils.toUtf8Bytes("unknown"),
        0,
        hash1Prime,
        didVersionInfo
      )
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.detachDidDocumentVersionHash(
        did,
        0,
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("unknown")),

        didVersionInfo
      )
    ).to.be.revertedWith("hash unknown");
    await expect(
      ts
        .connect(user2)
        .detachDidDocumentVersionHash(did, 0, hash1Prime, didVersionInfo)
    ).to.be.revertedWith("ctrl unknown");

    await expect(
      ts.detachDidDocumentVersionHash(did, 0, hashValue, didVersionInfo)
    ).to.be.revertedWith("last tsId");
  });

  it("detachDidDocumentVersionHash should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);
    // should work with empty  versionInfo
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes("othere40605e6")
    );
    const tsIdPrime = ethers.utils.sha256(hash1Prime);
    await expect(
      ts.appendDidDocumentVersionHash(did, 0, hash1Prime, [], didVersionInfo)
    )
      .to.emit(ts, "DidDocumentVersionHashAppended")
      .withArgs(recId, tsIdPrime, ethers.utils.hexlify(didVersionInfo));

    await expect(
      ts.detachDidDocumentVersionHash(did, 0, hashValue, didVersionInfo)
    )
      .to.emit(ts, "DidDocumentVersionHashDetached")
      .withArgs(
        recId,
        ethers.utils.hexlify(hashValue),
        ethers.utils.hexlify(didVersionInfo)
      );
  });

  it("appendDidDocumentVersionMetadata should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    const didVersionInfoPrime = ethers.utils.toUtf8Bytes("didVersionInfoPrime");
    const didVersionMetadataPrime =
      ethers.utils.toUtf8Bytes("didVersionMetadata");

    await expect(
      ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfoPrime,
        didVersionMetadataPrime
      )
    ).to.be.revertedWith("versionInfo unknown");

    await expect(
      ts.appendDidDocumentVersionMetadata(
        [],
        didVersionInfo,
        didVersionMetadata
      )
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.appendDidDocumentVersionMetadata(did, [], didVersionMetadata)
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.appendDidDocumentVersionMetadata(
        ethers.utils.toUtf8Bytes("unknown"),
        didVersionInfo,
        didVersionMetadata
      )
    ).to.be.revertedWith("record unknown");

    await expect(
      ts
        .connect(user2)
        .appendDidDocumentVersionMetadata(
          did,
          didVersionInfo,
          didVersionMetadataPrime
        )
    ).to.be.revertedWith("ctrl unknown");
  });

  it("appendDidDocumentVersionMetadata should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    const didVersionMetadataPrime =
      ethers.utils.toUtf8Bytes("didVersionMetadata");

    await expect(
      ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo,
        didVersionMetadataPrime
      )
    )
      .to.emit(ts, "DidDocumentVersionMetadataAppended")
      .withArgs(
        recId,
        ethers.utils.hexlify(didVersionMetadataPrime),
        ethers.utils.hexlify(didVersionInfo)
      );
  });

  it("detachDidDocumentVersionMetadata should fail for incorrect inputs", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    await expect(
      ts.detachDidDocumentVersionMetadata(
        [],
        didVersionInfo,
        didVersionMetadata
      )
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.detachDidDocumentVersionMetadata(did, [], didVersionMetadata)
    ).to.be.revertedWith("versionInfo empty");
    await expect(
      ts.detachDidDocumentVersionMetadata(
        ethers.utils.toUtf8Bytes("unknown"),
        didVersionInfo,
        didVersionMetadata
      )
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.detachDidDocumentVersionMetadata(
        did,
        ethers.utils.toUtf8Bytes("unknown"),

        didVersionInfo
      )
    ).to.be.revertedWith("versionInfo unknown");
    await expect(
      ts
        .connect(user2)
        .detachDidDocumentVersionMetadata(
          did,
          didVersionInfo,
          didVersionMetadata
        )
    ).to.be.revertedWith("ctrl unknown");
  });

  it("detachDidDocumentVersionMetadata should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const tsId = ethers.utils.sha256(hashValue);
    const recId = ethers.utils.sha256(did);
    await expect(
      ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentInserted")
      .withArgs(
        recId,
        tsId,
        ethers.utils.sha256(didVersionInfo),
        ethers.utils.sha256(didVersionMetadata)
      );
    const receipt = await ts.getDidTimestamps(1, 10);
    expect(receipt.items).to.deep.equal([tsId]);

    await expect(
      ts.detachDidDocumentVersionMetadata(
        did,
        didVersionInfo,
        didVersionMetadata
      )
    )
      .to.emit(ts, "DidDocumentVersionMetadataDetached")
      .withArgs(
        recId,
        ethers.utils.hexlify(didVersionMetadata),
        ethers.utils.hexlify(didVersionInfo)
      );
  });

  it("getDidRecordIdentifiers should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );

    // pagesize = 0 should revert
    await expect(ts.getDidRecordIdentifiers(1, 0)).to.be.revertedWith(
      "PSize not >0"
    );
    // page  = 0 should revert
    await expect(ts.getDidRecordIdentifiers(0, 10)).to.be.revertedWith(
      "Page not >0"
    );

    // pagesize > 50 should revert
    await expect(ts.getDidRecordIdentifiers(1, 51)).to.be.revertedWith(
      "PSize not <= 50"
    );
  });

  it("getDidRecordIdentifiers should succeed", async () => {
    const dids: string[] = [];
    const tsIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const hashValue = ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(`hash-${i}`)
      );
      const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo-${i}`);
      const timestampData = ethers.utils.toUtf8Bytes(`timestampData-${i}`);
      const didVersionMetadata = ethers.utils.toUtf8Bytes(
        `didVersionMetadata-${i}`
      );
      const did = ethers.utils.toUtf8Bytes(`did-${i}`);
      const tsId = ethers.utils.sha256(hashValue);

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        didVersionMetadata
      );
      dids.push(ethers.utils.hexlify(did));
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
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const ctrlId = admin.address;
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );

    ts.insertDidController(did, ctrlId, 1, 2);

    // pagesize = 0 should revert
    await expect(
      ts.getDidRecordIdentifiersByControllerId(ctrlId, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getDidRecordIdentifiersByControllerId(ctrlId, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getDidRecordIdentifiersByControllerId(ctrlId, 1, 51)
    ).to.be.revertedWith("PSize not <= 50");
  });

  it("getDidRecordIdentifiersByControllerId should succeed", async () => {
    const dids: string[] = [];
    const ctrlId = admin.address;
    for (let i = 1; i < 12; i += 1) {
      const hashValue = ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(`hash-${i}`)
      );
      const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo-${i}`);
      const timestampData = ethers.utils.toUtf8Bytes(`timestampData-${i}`);

      const did = ethers.utils.toUtf8Bytes(`did-${i}`);
      // eslint-disable-next-line no-await-in-loop
      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        []
      );

      dids.push(ethers.utils.hexlify(did));
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
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    const ctrlId = admin.address;
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );

    ts.insertDidController(did, ctrlId, 1, 2);

    // pagesize = 0 should revert
    await expect(
      ts.getDidRecordIdsByControllerId(ctrlId, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getDidRecordIdsByControllerId(ctrlId, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getDidRecordIdsByControllerId(ctrlId, 1, 51)
    ).to.be.revertedWith("PSize not <= 50");
  });

  it("getDidRecordIdsByControllerId should succeed", async () => {
    const dids: string[] = [];
    const ctrlId = admin.address;
    for (let i = 1; i < 12; i += 1) {
      const hashValue = ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(`hash-${i}`)
      );
      const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo-${i}`);
      const timestampData = ethers.utils.toUtf8Bytes(`timestampData-${i}`);

      const did = ethers.utils.toUtf8Bytes(`did-${i}`);
      // eslint-disable-next-line no-await-in-loop
      await ts.insertDidDocument(
        did,
        0,
        hashValue,
        didVersionInfo,
        timestampData,
        []
      );

      dids.push(ethers.utils.sha256(did));
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
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );
    await expect(ts.getLatestDidDocumentVersion([])).to.be.revertedWith(
      "identifier empty"
    );
    await expect(
      ts.getLatestDidDocumentVersion(ethers.utils.toUtf8Bytes("unknown"))
    ).to.be.revertedWith("record unknown");
  });

  it("getLatestDidDocumentVersion should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.utils.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.utils.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata
    );
    const r0 = await ts.getLatestDidDocumentVersion(did);
    expect(r0).to.equal(ethers.utils.hexlify(didVersionInfo1));

    const didVersionInfos: string[] = [];
    didVersionInfos.push(ethers.utils.sha256(didVersionInfo1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo-${i}`);
      const hash1Prime = ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(`hashPrime-${i}`)
      );
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], []);
      // eslint-disable-next-line no-await-in-loop
      const r = await ts.getLatestDidDocumentVersion(did);
      expect(r).to.equal(ethers.utils.hexlify(didVersionInfo));
      didVersionInfos.push(ethers.utils.hexlify(didVersionInfo));
    }
    const rlast = await ts.getLatestDidDocumentVersion(did);
    expect(rlast).to.equal(didVersionInfos.pop());
  });

  it("getDidRecord should fail with wrong input parameters", async () => {
    await expect(ts.getDidRecord([])).to.be.revertedWith("identifier empty");
    await expect(ts.getDidRecord(ethers.constants.HashZero)).to.be.revertedWith(
      "record unknown"
    );
  });

  it("getDidRecord should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.utils.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.utils.toUtf8Bytes(`did `);
    const recordId = ethers.utils.sha256(did);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );

    const r0 = await ts.getDidRecord(did);
    expect(r0.controllerIds).to.deep.equal([admin.address]);
    expect(r0.totalDidVersions).to.equal(1);

    // add version
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes(`hash1Prime `)
    );
    await ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], []);
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
    await expect(
      ts.getDidRecordById(ethers.constants.HashZero)
    ).to.be.revertedWith("recordId empty");
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    await expect(ts.getDidRecordById(hashValue)).to.be.revertedWith(
      "record unknown"
    );
  });

  it("getDidRecordById should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.utils.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.utils.toUtf8Bytes(`did `);
    const recordId = ethers.utils.sha256(did);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );

    const r0 = await ts.getDidRecordById(recordId);
    expect(r0.controllerIds).to.deep.equal([admin.address]);
    expect(r0.totalDidVersions).to.equal(1);

    // add version
    const hash1Prime = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes(`hash1Prime `)
    );
    await ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], []);
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
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );
    await expect(ts.getDidDocumentVersionIds([], 1, 10)).to.be.revertedWith(
      "identifier empty"
    );
    await expect(
      ts.getDidDocumentVersionIds(ethers.utils.toUtf8Bytes("unknown"), 1, 10)
    ).to.be.revertedWith("record unknown");
    // pagesize = 0 should revert
    await expect(ts.getDidDocumentVersionIds(did, 1, 0)).to.be.revertedWith(
      "PSize not >0"
    );
    // page  = 0 should revert
    await expect(ts.getDidDocumentVersionIds(did, 0, 10)).to.be.revertedWith(
      "Page not >0"
    );

    // pagesize > 50 should revert
    await expect(ts.getDidDocumentVersionIds(did, 1, 51)).to.be.revertedWith(
      "PSize not <= 50"
    );
  });

  it("getDidDocumentVersionIds should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.utils.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.utils.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata
    );

    const didVersionInfoIds: string[] = [];
    didVersionInfoIds.push(ethers.utils.sha256(didVersionInfo1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo-${i}`);
      const hash1Prime = ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(`hashPrime-${i}`)
      );
      const didVersionInfoId = ethers.utils.sha256(didVersionInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], []);

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
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.utils.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.utils.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata
    );
    const didVersionInfoIds: string[] = [];
    const didVersionInfos: string[] = [];
    didVersionInfoIds.push(ethers.utils.sha256(didVersionInfo1));
    didVersionInfos.push(ethers.utils.hexlify(didVersionInfo1));

    for (let i = 1; i < 11; i += 1) {
      const didVersionInfo = ethers.utils.toUtf8Bytes(`didVersionInfo-${i}`);
      const hash1Prime = ethers.utils.sha256(
        ethers.utils.toUtf8Bytes(`hashPrime-${i}`)
      );
      const didVersionInfoId = ethers.utils.sha256(didVersionInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateDidDocument(did, 0, hash1Prime, didVersionInfo, [], []);

      didVersionInfoIds.push(didVersionInfoId);
      didVersionInfos.push(ethers.utils.hexlify(didVersionInfo));
    }
    didVersionInfoIds.forEach(async (el, id) => {
      // eslint-disable-next-line no-await-in-loop
      const rlast = await ts.getDidDocumentVersionInfo(el);
      expect(rlast).to.equal(didVersionInfos[id]);
    });
  });

  it("getDidDocumentVersionMetadata should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata = ethers.utils.toUtf8Bytes(`didVersionMetadata `);
    const did = ethers.utils.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata
    );
    const didVersionMetadataIds: string[] = [];
    const didVersionMetadatas: string[] = [];
    didVersionMetadataIds.push(ethers.utils.sha256(didVersionMetadata));
    didVersionMetadatas.push(ethers.utils.hexlify(didVersionMetadata));

    for (let i = 1; i < 11; i += 1) {
      const didVersionMdata = ethers.utils.toUtf8Bytes(
        `didVersionMetadata-${i}`
      );

      const didVersionMetadataId = ethers.utils.sha256(didVersionMdata);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo1,
        didVersionMdata
      );
      didVersionMetadatas.push(ethers.utils.hexlify(didVersionMdata));
      didVersionMetadataIds.push(didVersionMetadataId);
    }
    didVersionMetadataIds.forEach(async (el, id) => {
      // eslint-disable-next-line no-await-in-loop
      const rlast = await ts.getDidDocumentVersionMetadata(el);
      expect(rlast).to.equal(didVersionMetadatas[id]);
    });
  });

  it("getDidDocumentVersionMetadataIds should fail with wrong page and pageSize", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did");

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );
    const didVersionInfoId = ethers.utils.sha256(didVersionInfo);
    await expect(
      ts.getDidDocumentVersionMetadataIds([], didVersionInfoId, 1, 10)
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, ethers.constants.HashZero, 1, 10)
    ).to.be.revertedWith("versionInfoId empty");
    await expect(
      ts.getDidDocumentVersionMetadataIds(
        ethers.utils.toUtf8Bytes("unknown"),
        didVersionInfoId,
        1,
        10
      )
    ).to.be.revertedWith("record unknown");
    // pagesize = 0 should revert
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, didVersionInfoId, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, didVersionInfoId, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getDidDocumentVersionMetadataIds(did, didVersionInfoId, 1, 51)
    ).to.be.revertedWith("PSize not <= 50");
  });

  it("getDidDocumentVersionMetadataIds should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.utils.sha256(didVersionInfo1);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata1 = ethers.utils.toUtf8Bytes(
      `didVersionMetadatainit `
    );
    const did = ethers.utils.toUtf8Bytes(`did `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata1
    );

    const didVersionMetadataIds: string[] = [];
    didVersionMetadataIds.push(ethers.utils.sha256(didVersionMetadata1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionMetadata = ethers.utils.toUtf8Bytes(
        `didVersionMetadata-${i}`
      );

      const didVersionMetadataId = ethers.utils.sha256(didVersionMetadata);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo1,
        didVersionMetadata
      );

      didVersionMetadataIds.push(didVersionMetadataId);
    }

    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1
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
      11
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
      11
    );
    expect(r1.items).to.deep.equal([]);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getDidDocumentVersionMetadataIds should succeed with empty metadata (new Uint8Array())", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.utils.sha256(didVersionInfo1);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const did = ethers.utils.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      new Uint8Array() // empty metadata
    );

    // It should return an empty list
    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1
    );

    expect(r0.items).to.deep.equal([]);
    expect(r0.total).to.equal(0);
    expect(r0.howMany).to.equal(0);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(1);
  });

  it("getDidDocumentVersionMetadataIds should succeed with empty metadata (0x)", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.utils.sha256(didVersionInfo1);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const did = ethers.utils.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      "0x" // empty metadata
    );

    // It should return an empty list
    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1
    );

    expect(r0.items).to.deep.equal([]);
    expect(r0.total).to.equal(0);
    expect(r0.howMany).to.equal(0);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(1);
  });

  it("getDidDocumentVersionMetadataIds should succeed with empty metadata ([])", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const didVersionInfoId = ethers.utils.sha256(didVersionInfo1);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const did = ethers.utils.toUtf8Bytes(`did `);

    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      []
    );

    // It should return an empty list
    const r0 = await ts.getDidDocumentVersionMetadataIds(
      did,
      didVersionInfoId,
      1,
      1
    );

    expect(r0.items).to.deep.equal([]);
    expect(r0.total).to.equal(0);
    expect(r0.howMany).to.equal(0);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(1);
  });

  it("getDidDocumentVersionDidTimestampIds should succeed", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`hash `));
    const didVersionInfo1 = ethers.utils.toUtf8Bytes(`didVersionInfo1`);
    const timestampId = ethers.utils.sha256(hashValue);
    const timestampData = ethers.utils.toUtf8Bytes(`timestampData `);
    const didVersionMetadata1 = ethers.utils.toUtf8Bytes(
      `didVersionMetadatainit `
    );
    const did = ethers.utils.toUtf8Bytes(`did `);
    const did1 = ethers.utils.toUtf8Bytes(`did1 `);
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo1,
      timestampData,
      didVersionMetadata1
    );

    const didVersionMetadataIds: string[] = [];
    didVersionMetadataIds.push(ethers.utils.sha256(didVersionMetadata1));
    for (let i = 1; i < 11; i += 1) {
      const didVersionMetadata = ethers.utils.toUtf8Bytes(
        `didVersionMetadata-${i}`
      );

      const didVersionMetadataId = ethers.utils.sha256(didVersionMetadata);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.appendDidDocumentVersionMetadata(
        did,
        didVersionInfo1,
        didVersionMetadata
      );

      didVersionMetadataIds.push(didVersionMetadataId);
    }
    const didVersionIds = await ts.getDidDocumentVersionDidTimestampIds(did, 1);
    expect(didVersionIds).to.deep.equal([timestampId]);
    await expect(
      ts.getDidDocumentVersionDidTimestampIds([], 1)
    ).to.be.revertedWith("identifier empty");
    await expect(
      ts.getDidDocumentVersionDidTimestampIds(did1, 2)
    ).to.be.revertedWith("record unknown");
    await expect(
      ts.getDidDocumentVersionDidTimestampIds(did, 2)
    ).to.be.revertedWith("unknown version");
  });

  it("should check if an address is a did controller", async () => {
    const hashValue = ethers.utils.sha256(ethers.utils.toUtf8Bytes("e40605e6"));
    const didVersionInfo = ethers.utils.toUtf8Bytes("didVersionInfo");
    const timestampData = ethers.utils.toUtf8Bytes("timestampData");
    const didVersionMetadata = ethers.utils.toUtf8Bytes("didVersionMetadata");
    const did = ethers.utils.toUtf8Bytes("did:ebsi:abc");
    await ts.insertDidDocument(
      did,
      0,
      hashValue,
      didVersionInfo,
      timestampData,
      didVersionMetadata
    );
    expect(await ts.checkController(did, admin.address)).to.equal(true);
    expect(await ts.checkController(did, user.address)).to.equal(false);
  });
});
