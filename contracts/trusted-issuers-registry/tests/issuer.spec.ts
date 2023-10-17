import { ethers, network } from "hardhat";
import crypto from "node:crypto";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { testDidrAddress, testTprAddress } from "./testAddress";
import type { DidRegistryMock, PolicyRegistryMock, Tir } from "../src/types";

const num = ethers.BigNumber.from;
enum IssuerType {
  Undefined,
  RootTAO,
  TAO,
  TI,
  Revoked,
}
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

function randomProxy(): string {
  return Buffer.from(
    JSON.stringify({
      prefix: "https://localhost/my-provider/revocation/",
      headers: { Authorization: "Bearer ABC" },
      testSuffix: "/credentials/status/1",
    }),
    "utf-8",
  ).toString("hex");
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
  let policyContractMock: PolicyRegistryMock;
  let didContractMock: DidRegistryMock;

  const attributeData1 = randomAttribute();
  const attributeData2 = randomAttribute();
  const attributeData3 = randomAttribute();
  const proxyData1 = randomProxy();
  const didIssuer = "did:ebsi:issuer";
  const taoDid = "did:ebsi:taodid";
  const taoDid2 = "did:ebsi:taodid2";
  const attributeTaoDid = randomAttribute();
  const attributeTaoDidId = ethers.utils.sha256(attributeTaoDid);
  const attributeTaoDid2 = randomAttribute();
  const attributeTaoDidId2 = ethers.utils.sha256(attributeTaoDid2);

  before(async () => {
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecodeTpr = await ethers.provider.getCode(
      tempPolicyContract.address,
    );
    await network.provider.send("hardhat_setCode", [
      testTprAddress,
      bytecodeTpr,
    ]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);

    const didRegistryFactory =
      await ethers.getContractFactory("DidRegistryMock");
    const tempDidContract = await didRegistryFactory.deploy();
    await tempDidContract.deployed();
    const bytecodeDid = await ethers.provider.getCode(tempDidContract.address);
    await network.provider.send("hardhat_setCode", [
      testDidrAddress,
      bytecodeDid,
    ]);

    didContractMock = didRegistryFactory.attach(testDidrAddress);
    await didContractMock.setDidResult(false);
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
    tir = await contractFactory.deploy(testTprAddress, testDidrAddress);
    await tir.deployed();
    await tir.initialize(42);
    await tir.setRegistryAddresses();
    const initialVersion = await tir.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(tir.address).to.properAddress;
  });

  describe("Entities", () => {
    it("should reject no authenticated users", async () => {
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(false);
      await expect(
        tir.insertIssuer(
          didIssuer,
          attributeData1,
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:insertIssuer",
      );
      // insert first before update
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);
      await tir.insertIssuer(
        didIssuer,
        attributeTaoDid,
        IssuerType.RootTAO,
        taoDid2,
        attributeTaoDidId,
      );
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(false);
      await expect(
        tir["updateIssuer(string,bytes,uint8,string,bytes32)"](
          didIssuer,
          attributeData1,
          IssuerType.TAO,
          didIssuer,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender is not TAO/RootTao it doesn't have the attribute TIR:updateIssuer",
      );

      await expect(
        tir["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
          didIssuer,
          attributeData1,
          attributeTaoDidId,
          IssuerType.RootTAO,
          didIssuer,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:updateIssuer",
      );

      // restrict even if the user has a did
      await expect(
        tir
          .connect(userWithDid)
          .insertIssuer(
            taoDid2,
            attributeData1,
            IssuerType.RootTAO,
            taoDid,
            attributeTaoDidId,
          ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:insertIssuer",
      );
    });

    it("should insert/update an issuer as admin", async () => {
      await policyContractMock.setPolicyResult(true); // is admin
      await didContractMock.setDidResult(false); // the admin is not a controller

      // insert issuer
      await expect(
        tir.insertIssuer(
          didIssuer,
          attributeData1,
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.emit(tir, "AddIssuerAttribute");
      let issuerHashes = await tir.getIssuer(didIssuer);
      expect(issuerHashes).to.be.an("array");
      expect(issuerHashes).to.have.length(1);

      // get attribute
      let issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
      expect(getEthObject(issuerAttr)).to.eql({
        did: didIssuer,
        attribData: attributeData1,
        issuerType: IssuerType.RootTAO,
        rootTao: didIssuer,
        tao: didIssuer,
      });

      // update: insert attribute
      await expect(
        tir["updateIssuer(string,bytes,uint8,string,bytes32)"](
          didIssuer,
          attributeData2,
          IssuerType.RootTAO,
          didIssuer,
          ethers.utils.sha256(attributeData1),
        ),
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
        issuerType: IssuerType.RootTAO,
        rootTao: didIssuer,
        tao: didIssuer,
      });

      issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[1]);
      expect(getEthObject(issuerAttr)).to.eql({
        did: didIssuer,
        attribData: attributeData2,
        issuerType: IssuerType.RootTAO,
        rootTao: didIssuer,
        tao: didIssuer,
      });

      // update: update attribute
      await expect(
        tir["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
          didIssuer,
          attributeData3,
          issuerHashes[1],
          IssuerType.RootTAO,
          didIssuer,
          ethers.utils.sha256(attributeData1),
        ),
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
        issuerType: IssuerType.RootTAO,
        rootTao: didIssuer,
        tao: didIssuer,
      });

      issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[1]);
      expect(getEthObject(issuerAttr)).to.eql({
        did: didIssuer,
        attribData: attributeData3,
        issuerType: IssuerType.RootTAO,
        rootTao: didIssuer,
        tao: didIssuer,
      });

      // the second attribute should has 2 revisions
      const attrRevisions = await tir.getIssuerAttributeRevisions(
        issuerHashes[1],
        1,
        10,
      );
      expect(getEthObject(attrRevisions)).to.eql({
        items: revisionsSecondHash,
        total: num(2),
        howMany: num(2),
        prev: num(1),
        next: num(1),
      });
    });

    it("should insert/update an issuer as TAO/RootTao", async () => {
      await policyContractMock.setPolicyResult(true); // is admin admin
      await didContractMock.setDidResult(false); // the admin is not a controller

      // insert issuer RootTao
      await expect(
        tir.insertIssuer(
          taoDid,
          attributeTaoDid,
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.emit(tir, "AddIssuerAttribute");
      // remove admin
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(true); // the admin is a controller

      // insert issuer type TAO by RooTTao
      await expect(
        tir.insertIssuer(
          taoDid2,
          attributeTaoDid2,
          IssuerType.TAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.emit(tir, "AddIssuerAttribute");
      // insert issuer as TAO
      await expect(
        tir.insertIssuer(
          didIssuer,
          attributeData1,
          IssuerType.TI,
          taoDid2,
          attributeTaoDidId2,
        ),
      ).to.emit(tir, "AddIssuerAttribute");

      // update: insert attribute
      await expect(
        tir["updateIssuer(string,bytes,uint8,string,bytes32)"](
          didIssuer,
          attributeData2,
          IssuerType.TI,
          taoDid2,
          attributeTaoDidId2,
        ),
      ).to.emit(tir, "UpdateIssuerAttribute");
      // update: update attribute
      const issuerHashes = await tir.getIssuer(didIssuer);
      await expect(
        tir["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
          didIssuer,
          attributeData3,
          issuerHashes[1],
          IssuerType.TI,
          taoDid2,
          attributeTaoDidId2,
        ),
      ).to.emit(tir, "UpdateIssuerAttribute");
    });

    it("should reject 2 issuers with the same did", async () => {
      await policyContractMock.setPolicyResult(true);
      await tir.insertIssuer(
        didIssuer,
        attributeData1,
        IssuerType.RootTAO,
        taoDid,
        attributeTaoDidId,
      );
      await expect(
        tir.insertIssuer(
          didIssuer,
          attributeData2,
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith("issuer already exist");
    });

    it("should get issuers", async () => {
      await policyContractMock.setPolicyResult(true);

      // insert issuers
      const issuers: string[] = [];
      for (let i = 0; i < 18; i += 1) {
        issuers[i] = randomDid();
        // eslint-disable-next-line no-await-in-loop
        await tir.insertIssuer(
          issuers[i],
          randomAttribute(),
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        );
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

    it("should reject a get or update of an unknown did", async () => {
      await policyContractMock.setPolicyResult(true);
      await expect(tir.getIssuer(didIssuer)).to.be.revertedWith(
        "issuer does not exist",
      );
      await expect(
        tir["updateIssuer(string,bytes,uint8,string,bytes32)"](
          didIssuer,
          attributeData1,
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith("issuer does not exist");
      await expect(
        tir["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
          didIssuer,
          attributeData1,
          randomHash(),
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith("issuer does not exist");
    });
  });

  describe("Attributes", () => {
    it("setAttributeMetadata fail if conditions fail", async () => {
      await policyContractMock.setPolicyResult(false); // enable admin
      await expect(
        tir.setAttributeMetadata(
          didIssuer,
          ethers.utils.sha256(attributeData1),
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:setAttributeMetadata",
      );
    });

    it("should get latest metadata during setAttributeData", async () => {
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      const attributeIdAsRootTAO = crypto.randomBytes(32);
      const attributeIdAsTI = crypto.randomBytes(32);
      const attributeData = crypto.randomBytes(5);

      await tir.setAttributeMetadata(
        didIssuer,
        attributeIdAsRootTAO,
        IssuerType.RootTAO,
        didIssuer,
        attributeIdAsRootTAO,
      );

      // set an attribute as TI
      await tir.setAttributeMetadata(
        didIssuer,
        attributeIdAsTI,
        IssuerType.TI,
        didIssuer,
        attributeIdAsRootTAO,
      );

      // revoke that attribute
      await tir.setAttributeMetadata(
        didIssuer,
        attributeIdAsTI,
        IssuerType.Revoked,
        didIssuer,
        attributeIdAsRootTAO,
      );

      // fill the data
      await tir.setAttributeData(didIssuer, attributeIdAsTI, attributeData);

      // expect the attribute to be revoked
      const issuerHashes = await tir.getIssuer(didIssuer);
      expect(issuerHashes).to.be.an("array");
      expect(issuerHashes).to.have.length(2);

      // get the second attribute
      const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[1]);
      expect(getEthObject(issuerAttr)).to.eql({
        did: didIssuer,
        attribData: `0x${attributeData.toString("hex")}`,
        issuerType: IssuerType.Revoked,
        rootTao: didIssuer,
        tao: didIssuer,
      });
    });

    it("should accept any attribute revision as argument in setAttributeMetadata", async () => {
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      // create rootTAO
      const rootTAO = {
        did: "did:ebsi:rootTAO",
        attributeId: crypto.randomBytes(32),
      };
      await tir.setAttributeMetadata(
        rootTAO.did,
        rootTAO.attributeId,
        IssuerType.RootTAO,
        rootTAO.did,
        rootTAO.attributeId,
      );

      await policyContractMock.setPolicyResult(false);

      // create TAO
      const taoAttributeData = crypto.randomBytes(100);
      const TAO = {
        did: "did:ebsi:TAO",
        attribute: {
          firstId: crypto.randomBytes(32),
          data: taoAttributeData,
          revisionId2: ethers.utils.sha256(taoAttributeData),
        },
      };

      // preregister the TAO (attributeId = firstId)
      await tir.setAttributeMetadata(
        TAO.did,
        TAO.attribute.firstId,
        IssuerType.TI,
        rootTAO.did,
        rootTAO.attributeId,
      );

      // register attribute data (SC will create revisionId2)
      await tir.setAttributeData(
        TAO.did,
        TAO.attribute.firstId,
        TAO.attribute.data,
      );

      // update the metadata of the TAO
      // using latest revision ID
      await tir.setAttributeMetadata(
        TAO.did,
        TAO.attribute.revisionId2, // using revisionId2 instead of firstId
        IssuerType.TAO,
        rootTAO.did,
        rootTAO.attributeId,
      );

      const attrRevisions = await tir.getIssuerAttributeRevisions(
        TAO.attribute.firstId,
        1,
        10,
      );

      // expect firstId and revisionId2 in the revisions
      const revisions = getEthObject(attrRevisions);
      expect(revisions.items)
        .to.be.an("array")
        .that.includes(`0x${TAO.attribute.firstId.toString("hex")}`);
      expect(revisions.items)
        .to.be.an("array")
        .that.includes(TAO.attribute.revisionId2);

      // expect 3 revisions: firstId, revisionId2, and third update
      delete revisions.items;
      expect(revisions).to.eql({
        total: num(3),
        howMany: num(3),
        prev: num(1),
        next: num(1),
      });
    });

    it("should be able to revoke a RootTAO by an admin from TPR", async () => {
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      const attributeIdAsRootTAO = crypto.randomBytes(32);
      const didSupportOffice = "did:ebsi:supportOffice";
      const anyAttributeId = crypto.randomBytes(32);

      // create support office
      await tir.setAttributeMetadata(
        didSupportOffice,
        anyAttributeId,
        IssuerType.RootTAO,
        didSupportOffice,
        anyAttributeId,
      );

      // set issuer as RootTAO
      await tir.setAttributeMetadata(
        didIssuer,
        attributeIdAsRootTAO,
        IssuerType.RootTAO,
        didSupportOffice,
        anyAttributeId,
      );

      // expect the attribute to be RootTAO
      let issuerHashes = await tir.getIssuer(didIssuer);
      expect(issuerHashes).to.be.an("array");
      expect(issuerHashes).to.have.length(1);

      // get the attribute
      let issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
      expect(getEthObject(issuerAttr)).to.eql({
        did: didIssuer,
        attribData: "0x",
        issuerType: IssuerType.RootTAO,
        // the rootTao is the issuer itself
        rootTao: didIssuer,
        tao: didIssuer,
      });

      // revoke RootTAO attribute
      await tir.setAttributeMetadata(
        didIssuer,
        attributeIdAsRootTAO,
        IssuerType.Revoked,
        didSupportOffice,
        anyAttributeId,
      );

      // expect the attribute to be revoked
      issuerHashes = await tir.getIssuer(didIssuer);
      expect(issuerHashes).to.be.an("array");
      expect(issuerHashes).to.have.length(1);

      // get the attribute
      issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
      expect(getEthObject(issuerAttr)).to.eql({
        did: didIssuer,
        attribData: "0x",
        issuerType: IssuerType.Revoked,
        // here the rootTao and tao is reassigned to support office
        rootTao: didSupportOffice,
        tao: didSupportOffice,
      });
    });

    it("should update its own attributes only if it's a RootTAO", async () => {
      // insert issuer
      await policyContractMock.setPolicyResult(true); // enable admin
      await tir.insertIssuer(
        didIssuer,
        attributeData1,
        IssuerType.RootTAO,
        taoDid,
        attributeTaoDidId,
      );
      await policyContractMock.setPolicyResult(false); // disable admin

      await didContractMock.setDidResult(true); // is a controller
      // update: insert attribute
      await expect(
        tir
          .connect(issuer)
          ["updateIssuer(string,bytes,uint8,string,bytes32)"](
            didIssuer,
            attributeData2,
            IssuerType.TAO,
            didIssuer,
            ethers.utils.sha256(attributeData1),
          ),
      ).to.emit(tir, "UpdateIssuerAttribute");
      const issuerHashes = await tir.getIssuer(didIssuer);

      // update: update attribute
      await expect(
        tir
          .connect(issuer)
          ["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
            didIssuer,
            attributeData3,
            issuerHashes[0],
            IssuerType.TAO,
            didIssuer,
            ethers.utils.sha256(attributeData1),
          ),
      ).to.emit(tir, "UpdateIssuerAttribute");
    });

    it("should reject 2 dids with the same attribute", async () => {
      await policyContractMock.setPolicyResult(true);
      await tir.insertIssuer(
        didIssuer,
        attributeData1,
        IssuerType.RootTAO,
        taoDid,
        attributeTaoDidId,
      );
      await expect(
        tir.insertIssuer(
          randomDid(),
          attributeData1,
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith("attribute is already stored");

      const did2 = randomDid();
      await tir.insertIssuer(
        did2,
        attributeData2,
        IssuerType.RootTAO,
        taoDid,
        attributeTaoDidId,
      );
      await expect(
        tir["updateIssuer(string,bytes,uint8,string,bytes32)"](
          did2,
          attributeData1,
          IssuerType.RootTAO,
          didIssuer,
          ethers.utils.sha256(attributeData1),
        ),
      ).to.be.revertedWith("attribute is already stored");

      const [prevHash] = await tir.getIssuer(did2);
      await expect(
        tir["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
          did2,
          attributeData1,
          prevHash,
          IssuerType.RootTAO,
          didIssuer,
          ethers.utils.sha256(attributeData1),
        ),
      ).to.be.revertedWith("revision already stored");
    });

    it("should reject an update of an unknown attribute", async () => {
      await policyContractMock.setPolicyResult(true);
      await tir.insertIssuer(
        didIssuer,
        attributeData1,
        IssuerType.RootTAO,
        taoDid,
        attributeTaoDidId,
      );
      await expect(
        tir["updateIssuer(string,bytes,bytes32,uint8,string,bytes32)"](
          didIssuer,
          attributeData2,
          randomHash(),
          IssuerType.RootTAO,
          taoDid,
          attributeTaoDidId,
        ),
      ).to.be.revertedWith("attributeId is not link to DID");
    });

    it("should reject the get of an unknown attribute", async () => {
      await expect(
        tir.getIssuerAttributeByHash(randomHash()),
      ).to.be.revertedWith("attribute has not been found");
      await expect(
        tir.getIssuerAttributeRevisions(randomHash(), 1, 10),
      ).to.be.revertedWith("attribute has not been found");
    });
  });

  describe("Proxies", () => {
    it("addIssuerProxy: inserts a new proxy record", async () => {
      // Focus only on proxy management logic regardless of policy and did validations.
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      await expect(tir.addIssuerProxy(didIssuer, proxyData1)).to.emit(
        tir,
        "AddIssuerProxy",
      );
      const issuerProxies = await tir.getIssuerProxies(didIssuer);
      expect(issuerProxies).to.be.an("array");
      expect(issuerProxies).to.have.length(1);
    });

    it("addIssuerProxy permissions: did controller and TIR:updateIssuer", async () => {
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(false);

      // Adding a new proxy config
      await expect(
        tir.addIssuerProxy(didIssuer, proxyData1),
      ).to.be.revertedWith(
        "Policy error: sender is not controller of the did did:ebsi:issuer and it doesn't have the attribute TIR:updateIssuer",
      );
    });

    it("getIssuerProxyById: get a proxy record", async () => {
      // Focus only on proxy management logic regardless of policy and did validations.
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      await expect(tir.addIssuerProxy(didIssuer, proxyData1)).to.emit(
        tir,
        "AddIssuerProxy",
      );

      const [proxyId] = await tir.getIssuerProxies(didIssuer);
      const proxyDataReturned = await tir.getIssuerProxyById(
        didIssuer,
        proxyId,
      );
      expect(proxyDataReturned).to.not.eq(undefined);
    });

    it("updateIssuerProxy: update a specific proxy record", async () => {
      // Focus only on proxy management logic regardless of policy and did validations.
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      await expect(tir.addIssuerProxy(didIssuer, proxyData1)).to.emit(
        tir,
        "AddIssuerProxy",
      );

      const [proxyId] = await tir.getIssuerProxies(didIssuer);
      // Get previous proxy config and change/update it.
      let proxyData = await tir.getIssuerProxyById(didIssuer, proxyId);

      proxyData = randomProxy();

      await expect(
        tir.updateIssuerProxy(didIssuer, proxyId, proxyData),
      ).to.emit(tir, "UpdateIssuerProxy");

      // No new records should be added.
      const issuerProxies = await tir.getIssuerProxies(didIssuer);
      expect(issuerProxies).to.be.an("array");
      expect(issuerProxies).to.have.length(1);
    });

    it("updateIssuerProxy permissions: did controller and TIR:updateIssuer", async () => {
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      await expect(tir.addIssuerProxy(didIssuer, proxyData1)).to.emit(
        tir,
        "AddIssuerProxy",
      );

      const [proxyId] = await tir.getIssuerProxies(didIssuer);

      // Toggle permissions
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(false);

      await expect(
        tir.updateIssuerProxy(didIssuer, proxyId, proxyData1),
      ).to.be.revertedWith(
        "Policy error: sender is not controller of the did did:ebsi:issuer and it doesn't have the attribute TIR:updateIssuer",
      );
    });
  });
});
