import { ethers, network } from "hardhat";
import crypto from "crypto";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { Tir } from "../src/types";
import { testDidrAddress, testTprAddress } from "./testAddress";

const num = ethers.BigNumber.from;

function getEthObject(o: unknown): Record<string, unknown> {
  const obj = o as string[] & Record<string, unknown>;
  const keys = Object.keys(obj);
  const result: Record<string, unknown> = {};
  keys.forEach((k, i) => {
    if (i >= keys.length / 2) result[k] = obj[k];
  });
  return result;
}

function randomAttribute(): string {
  return `0x${crypto.randomBytes(10).toString("hex")}`;
}

function randomDid(): string {
  return `did:ebsi:${crypto.randomBytes(5).toString("hex")}`;
}

function randomHash(): string {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

describe("Issuers", () => {
  let tir: Tir;
  let userWithDid: SignerWithAddress;
  let issuer: SignerWithAddress;
  let policyContractMock: Contract;
  let didContractMock: Contract;

  const attributeData1 = randomAttribute();
  const attributeData2 = randomAttribute();
  const attributeData3 = randomAttribute();
  const didIssuer = "did:ebsi:issuer";
  const zeroHash = new Uint8Array(32);

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecodeTpr = await ethers.provider.getCode(
      tempPolicyContract.address
    );
    await network.provider.send("hardhat_setCode", [
      testTprAddress,
      bytecodeTpr,
    ]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);

    const didRegistryFactory = await ethers.getContractFactory(
      "DidRegistryMock"
    );
    const tempDidContract = await didRegistryFactory.deploy();
    await tempDidContract.deployed();
    const bytecodeDid = await ethers.provider.getCode(tempDidContract.address);
    await network.provider.send("hardhat_setCode", [
      testDidrAddress,
      bytecodeDid,
    ]);
    didContractMock = didRegistryFactory.attach(testDidrAddress);
    await didContractMock.setDidResult(true);
  });

  beforeEach(async () => {
    [userWithDid, issuer] = await ethers.getSigners();
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();

    const contractFactory = await ethers.getContractFactory("Tir", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    tir = (await contractFactory.deploy()) as Tir;
    await tir.initialize(42);
    await tir.setRegistryAddresses();
    const initialVersion = await tir.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(tir.address).to.properAddress;
  });

  it("should reject no authenticated users", async () => {
    await policyContractMock.setPolicyResult(false);
    await didContractMock.setDidResult(false);
    await expect(
      tir.insertIssuer(didIssuer, attributeData1)
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TIR:insertIssuer"
    );

    await expect(
      tir["updateIssuer(string,bytes)"](didIssuer, attributeData1)
    ).to.be.revertedWith(
      "Policy error: sender is not controller of the did did:ebsi:issuer and it doesn't have the attribute TIR:updateIssuer"
    );

    await expect(
      tir["updateIssuer(string,bytes,bytes32)"](
        didIssuer,
        attributeData1,
        zeroHash
      )
    ).to.be.revertedWith(
      "Policy error: sender is not controller of the did did:ebsi:issuer and it doesn't have the attribute TIR:updateIssuer"
    );

    // restrict even if the user has a did
    await expect(
      tir.connect(userWithDid).insertIssuer(didIssuer, attributeData1)
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TIR:insertIssuer"
    );
  });

  it("should insert/update an issuer as admin", async () => {
    await policyContractMock.setPolicyResult(true); // is admin
    await didContractMock.setDidResult(false); // the admin is not a controller

    // insert issuer
    await expect(tir.insertIssuer(didIssuer, attributeData1)).to.emit(
      tir,
      "AddIssuerAttribute"
    );
    let issuerHashes = await tir.getIssuer(didIssuer);
    expect(issuerHashes).to.be.an("array");
    expect(issuerHashes).to.have.length(1);

    // get attribute
    let issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      did: didIssuer,
      attribData: attributeData1,
    });

    // update: insert attribute
    await expect(
      tir["updateIssuer(string,bytes)"](didIssuer, attributeData2)
    ).to.emit(tir, "UpdateIssuerAttribute");
    issuerHashes = await tir.getIssuer(didIssuer);
    expect(issuerHashes).to.be.an("array");
    expect(issuerHashes).to.have.length(2);
    const revisionsSecondHash = [issuerHashes[1]];

    // get attributes
    issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      did: didIssuer,
      attribData: attributeData1,
    });

    issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[1]);
    expect(getEthObject(issuerAttr)).to.eql({
      did: didIssuer,
      attribData: attributeData2,
    });

    // update: update attribute
    await expect(
      tir["updateIssuer(string,bytes,bytes32)"](
        didIssuer,
        attributeData3,
        issuerHashes[1]
      )
    ).to.emit(tir, "UpdateIssuerAttribute");
    issuerHashes = await tir.getIssuer(didIssuer);
    expect(issuerHashes).to.be.an("array");
    expect(issuerHashes).to.have.length(2);
    revisionsSecondHash.push(issuerHashes[1]);

    // get attributes
    issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      did: didIssuer,
      attribData: attributeData1,
    });

    issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[1]);
    expect(getEthObject(issuerAttr)).to.eql({
      did: didIssuer,
      attribData: attributeData3,
    });

    // the second attribute should has 2 revisions
    const attrRevisions = await tir.getIssuerAttributeRevisions(
      issuerHashes[1],
      1,
      10
    );
    expect(getEthObject(attrRevisions)).to.eql({
      items: revisionsSecondHash,
      total: num(2),
      howMany: num(2),
      prev: num(1),
      next: num(1),
    });
  });

  it("should update its own attributes", async () => {
    // insert issuer
    await policyContractMock.setPolicyResult(true); // enable admin
    await tir.insertIssuer(didIssuer, attributeData1);
    await policyContractMock.setPolicyResult(false); // disable admin

    await didContractMock.setDidResult(true); // is a controller
    // update: insert attribute
    await expect(
      tir
        .connect(issuer)
        ["updateIssuer(string,bytes)"](didIssuer, attributeData2)
    ).to.emit(tir, "UpdateIssuerAttribute");
    const issuerHashes = await tir.getIssuer(didIssuer);

    // update: update attribute
    await expect(
      tir
        .connect(issuer)
        ["updateIssuer(string,bytes,bytes32)"](
          didIssuer,
          attributeData3,
          issuerHashes[0]
        )
    ).to.emit(tir, "UpdateIssuerAttribute");
  });

  it("should get issuers", async () => {
    await policyContractMock.setPolicyResult(true);

    // insert issuers

    const issuers = [];
    for (let i = 0; i < 18; i += 1) {
      issuers[i] = randomDid();
      await (await tir.insertIssuer(issuers[i], randomAttribute())).wait();
    }

    // get issuers: page 1
    let issPagination = await tir.getIssuers(1, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: issuers.slice(0, 5),
      total: num(18),
      howMany: num(5),
      prev: num(1),
      next: num(2),
    });

    // get issuers: page 2
    issPagination = await tir.getIssuers(2, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: issuers.slice(5, 10),
      total: num(18),
      howMany: num(5),
      prev: num(1),
      next: num(3),
    });

    // get issuers: page 3
    issPagination = await tir.getIssuers(3, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: issuers.slice(10, 15),
      total: num(18),
      howMany: num(5),
      prev: num(2),
      next: num(4),
    });

    // get issuers: page 4
    issPagination = await tir.getIssuers(4, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: issuers.slice(15, 20),
      total: num(18),
      howMany: num(3),
      prev: num(3),
      next: num(4),
    });
  });

  it("should reject 2 issuers with the same did", async () => {
    await policyContractMock.setPolicyResult(true);
    await tir.insertIssuer(didIssuer, attributeData1);
    await expect(
      tir.insertIssuer(didIssuer, attributeData2)
    ).to.be.revertedWith("issuer already exist");
  });

  it("should reject 2 dids with the same attribute", async () => {
    await policyContractMock.setPolicyResult(true);
    await tir.insertIssuer(didIssuer, attributeData1);
    await expect(
      tir.insertIssuer(randomDid(), attributeData1)
    ).to.be.revertedWith("attribute is already stored");

    const did2 = randomDid();
    await tir.insertIssuer(did2, attributeData2);
    await expect(
      tir["updateIssuer(string,bytes)"](did2, attributeData1)
    ).to.be.revertedWith("attribute is already stored");

    const [prevHash] = await tir.getIssuer(did2);
    await expect(
      tir["updateIssuer(string,bytes,bytes32)"](did2, attributeData1, prevHash)
    ).to.be.revertedWith("attribute is already stored");
  });

  it("should reject a get or update of an unknown did", async () => {
    await policyContractMock.setPolicyResult(true);
    await expect(tir.getIssuer(didIssuer)).to.be.revertedWith(
      "issuer does not exist"
    );
    await expect(
      tir["updateIssuer(string,bytes)"](didIssuer, attributeData1)
    ).to.be.revertedWith("issuer does not exist");
    await expect(
      tir["updateIssuer(string,bytes,bytes32)"](
        didIssuer,
        attributeData1,
        randomHash()
      )
    ).to.be.revertedWith("issuer does not exist");
  });

  it("should reject an update of an unknown attribute", async () => {
    await policyContractMock.setPolicyResult(true);
    await tir.insertIssuer(didIssuer, attributeData1);
    await expect(
      tir["updateIssuer(string,bytes,bytes32)"](
        didIssuer,
        attributeData2,
        randomHash()
      )
    ).to.be.revertedWith("lastVersHash is not link to DID");
  });

  it("should reject the get of an unknown attribute", async () => {
    await expect(tir.getIssuerAttributeByHash(randomHash())).to.be.revertedWith(
      "attribute has not been found"
    );
    await expect(
      tir.getIssuerAttributeRevisions(randomHash(), 1, 10)
    ).to.be.revertedWith("attribute has not been found");
  });
});
