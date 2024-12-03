import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import crypto from "node:crypto";

import type {
  DidRegistryMock,
  PolicyRegistryMock,
  Tir,
  TirDetailed,
} from "../src/types";

import { testDidrAddress, testTprAddress } from "./testAddress";

enum IssuerType {
  Undefined,
  RootTAO,
  TAO,
  TI,
  Revoked,
}
function getEthObject(o: unknown): Record<string, unknown> {
  const obj = o as Record<string, unknown> & string[];
  const keys = Object.keys(obj);
  const result: Record<string, unknown> = {};
  for (const [i, k] of keys.entries()) {
    if (i >= keys.length / 2) result[k] = obj[k];
  }
  return result;
}

function randomDid(): string {
  return `did:ebsi:${crypto.randomBytes(5).toString("hex")}`;
}

function randomHash(): string {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

function randomProxy(): string {
  return Buffer.from(
    JSON.stringify({
      headers: { Authorization: "Bearer ABC" },
      prefix: "https://localhost/my-provider/revocation/",
      testSuffix: "/credentials/status/1",
    }),
    "utf8",
  ).toString("hex");
}

describe("Issuers", () => {
  let tir: Tir;
  let policyContractMock: PolicyRegistryMock;
  let didContractMock: DidRegistryMock;

  const rootTAO1 = {
    attribute: `0x${crypto.randomBytes(10).toString("hex")}`,
    attributeId: `0x${crypto.randomBytes(32).toString("hex")}`,
    did: "did:ebsi:roottao1",
    revisionId: "",
  };
  rootTAO1.revisionId = ethers.utils.sha256(rootTAO1.attribute);

  const tao1 = {
    attribute: `0x${crypto.randomBytes(10).toString("hex")}`,
    attributeId: `0x${crypto.randomBytes(32).toString("hex")}`,
    did: "did:ebsi:tao1",
    revisionId: "",
  };
  tao1.revisionId = ethers.utils.sha256(tao1.attribute);

  const tao2 = {
    attribute: `0x${crypto.randomBytes(10).toString("hex")}`,
    attributeId: `0x${crypto.randomBytes(32).toString("hex")}`,
    did: "did:ebsi:tao2",
    proxyData: randomProxy(),
    revisionId: "",
  };
  tao2.revisionId = ethers.utils.sha256(tao2.attribute);

  const ti1 = {
    attribute1: `0x${crypto.randomBytes(10).toString("hex")}`,
    attribute2: `0x${crypto.randomBytes(10).toString("hex")}`,
    attributeId1: `0x${crypto.randomBytes(32).toString("hex")}`,
    attributeId2: `0x${crypto.randomBytes(32).toString("hex")}`,
    did: "did:ebsi:ti1",
    revisionId1: "",
    revisionId2: "",
  };
  ti1.revisionId1 = ethers.utils.sha256(ti1.attribute1);
  ti1.revisionId2 = ethers.utils.sha256(ti1.attribute2);

  const proxyData1 = randomProxy();
  const didIssuer = "did:ebsi:issuer";

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
    const contractFactory = await ethers.getContractFactory("Tir", {});
    tir = await contractFactory.deploy(testTprAddress, testDidrAddress);
    await tir.deployed();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(tir.address).to.properAddress;
  });

  async function registerRootTAO1() {
    await policyContractMock.setPolicyResult(true); // is admin
    await didContractMock.setDidResult(false); // the admin is not a controller

    // create rootTAO
    await expect(
      tir.setAttributeMetadata(
        rootTAO1.did,
        rootTAO1.attributeId,
        IssuerType.RootTAO,
        rootTAO1.did,
        rootTAO1.attributeId,
      ),
    ).to.emit(tir, "AddAttributeRevision");

    // get RootTAO attribute
    let issuerHashes = await tir.getIssuer(rootTAO1.did);
    expect(issuerHashes).to.eql([rootTAO1.attributeId]);
    let issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      attribData: "0x",
      did: rootTAO1.did,
      issuerType: IssuerType.RootTAO,
      rootTao: rootTAO1.did,
      tao: rootTAO1.did,
    });

    expect(
      (
        await tir.getIssuerAttributeRevisions(issuerHashes[0], 1, 2)
      ).total.toNumber(),
    ).to.eq(1);

    await policyContractMock.setPolicyResult(false); // not admin
    await didContractMock.setDidResult(true); // controller of the DID

    // RootTAO registers the credential
    await expect(
      tir.setAttributeData(
        rootTAO1.did,
        rootTAO1.attributeId,
        rootTAO1.attribute,
      ),
    ).to.emit(tir, "AddAttributeRevision");

    // get RootTAO attribute
    issuerHashes = await tir.getIssuer(rootTAO1.did);
    expect(issuerHashes).to.eql([rootTAO1.revisionId]);
    issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      attribData: rootTAO1.attribute,
      did: rootTAO1.did,
      issuerType: IssuerType.RootTAO,
      rootTao: rootTAO1.did,
      tao: rootTAO1.did,
    });
  }

  async function registerTAO1() {
    await policyContractMock.setPolicyResult(false); // not admin
    await didContractMock.setDidResult(true); // controller of the DID

    // RootTAO registers a TAO
    await expect(
      tir.setAttributeMetadata(
        tao1.did,
        tao1.attributeId,
        IssuerType.TAO,
        rootTAO1.did,
        rootTAO1.attributeId,
      ),
    ).to.emit(tir, "AddAttributeRevision");

    // TAO registers the credential
    await expect(
      tir.setAttributeData(tao1.did, tao1.attributeId, tao1.attribute),
    ).to.emit(tir, "AddAttributeRevision");

    // get TAO attribute
    const issuerHashes = await tir.getIssuer(tao1.did);
    expect(issuerHashes).to.eql([tao1.revisionId]);
    const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      attribData: tao1.attribute,
      did: tao1.did,
      issuerType: IssuerType.TAO,
      rootTao: rootTAO1.did,
      tao: rootTAO1.did,
    });
  }

  async function registerTAO2() {
    await policyContractMock.setPolicyResult(false); // not admin
    await didContractMock.setDidResult(true); // controller of the DID

    // RootTAO registers a TAO
    await expect(
      tir.setAttributeMetadata(
        tao2.did,
        tao2.attributeId,
        IssuerType.TAO,
        rootTAO1.did,
        rootTAO1.attributeId,
      ),
    ).to.emit(tir, "AddAttributeRevision");

    // TAO registers the credential
    await expect(
      tir.setAttributeData(tao2.did, tao2.attributeId, tao2.attribute),
    ).to.emit(tir, "AddAttributeRevision");

    // get TAO attribute
    const issuerHashes = await tir.getIssuer(tao2.did);
    expect(issuerHashes).to.eql([tao2.revisionId]);
    const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      attribData: tao2.attribute,
      did: tao2.did,
      issuerType: IssuerType.TAO,
      rootTao: rootTAO1.did,
      tao: rootTAO1.did,
    });
  }

  async function registerTI() {
    await policyContractMock.setPolicyResult(false); // not admin
    await didContractMock.setDidResult(true); // controller of the DID

    // TAO registers a TI
    await expect(
      tir.setAttributeMetadata(
        ti1.did,
        ti1.attributeId1,
        IssuerType.TI,
        tao1.did,
        tao1.attributeId,
      ),
    ).to.emit(tir, "AddAttributeRevision");

    // TI registers the credential
    await expect(
      tir.setAttributeData(ti1.did, ti1.attributeId1, ti1.attribute1),
    ).to.emit(tir, "AddAttributeRevision");

    // get TI attribute
    const issuerHashes = await tir.getIssuer(ti1.did);
    expect(issuerHashes).to.eql([ti1.revisionId1]);
    const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
    expect(getEthObject(issuerAttr)).to.eql({
      attribData: ti1.attribute1,
      did: ti1.did,
      issuerType: IssuerType.TI,
      rootTao: rootTAO1.did,
      tao: tao1.did,
    });
  }

  describe("Attributes", () => {
    it("should reject no authenticated users", async () => {
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(false);
      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId1,
          IssuerType.RootTAO,
          tao1.did,
          tao1.attributeId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:setAttributeMetadata",
      );
    });

    it("should insert issuers following the chain of trust", async () => {
      await registerRootTAO1();
      await registerTAO1();
      await registerTAO2();
      await registerTI();
    });

    it("should revoke an issuer", async () => {
      await registerRootTAO1();
      await registerTAO1();

      // RootTAO revokes TAO
      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.Revoked,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.emit(tir, "AddAttributeRevision");

      // get TAO attribute
      const issuerHashes = await tir.getIssuer(tao1.did);
      const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
      expect(getEthObject(issuerAttr)).to.eql({
        attribData: "0x",
        did: tao1.did,
        issuerType: IssuerType.Revoked,
        rootTao: rootTAO1.did,
        tao: rootTAO1.did,
      });
    });

    it("should not initialize if not proxy", async () => {
      await expect(tir.initialize(1)).to.be.revertedWith(
        "Initializable: contract is already initialized",
      );
    });

    it("should initialize if proxy", async () => {
      const contractFactory = await ethers.getContractFactory("Tir", {});
      const tsProxy = (await upgrades.deployProxy(contractFactory, [42], {
        constructorArgs: [testTprAddress, testDidrAddress],
        unsafeAllow: [
          "constructor",
          "external-library-linking",
          "state-variable-immutable",
        ],
      })) as Tir;
      await tsProxy.deployed();
      expect((await tsProxy.version()).toString()).to.equal("42");
    });

    it("should fail to call init on TirDetailed", async () => {
      const contractFactory = await ethers.getContractFactory("Tir", {});
      const tsProxy = (await upgrades.deployProxy(contractFactory, [42], {
        constructorArgs: [testTprAddress, testDidrAddress],
        unsafeAllow: [
          "constructor",
          "external-library-linking",
          "state-variable-immutable",
        ],
      })) as Tir;

      await tsProxy.deployed();

      // FIXME: this test should be awaited, but it fails with another message
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      expect(tsProxy.init(30)).to.be.revertedWith(
        "Initializable: contract is already initialized",
      );
    });

    it("should fail to get issuer if it doesn't exist", async () => {
      await expect(tir.getIssuer(randomDid())).to.be.revertedWith(
        "issuer does not exist",
      );
    });

    it("should fail to init", async () => {
      const contractFactory = await ethers.getContractFactory("TirDetailed");
      const tirDetailedProxy = (await upgrades.deployProxy(
        contractFactory,
        [],
      )) as TirDetailed;

      await tirDetailedProxy.deployed();

      await expect(tirDetailedProxy.init(42)).to.be.revertedWith(
        "Initializable: contract is not initializing",
      );
    });

    it("should fail on 0 address", async () => {
      const contractFactory = await ethers.getContractFactory("Tir", {});
      await expect(
        upgrades.deployProxy(contractFactory, [42], {
          constructorArgs: [
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
          ],
          unsafeAllow: [
            "constructor",
            "external-library-linking",
            "state-variable-immutable",
          ],
        }),
      ).to.be.revertedWith("zero address");
    });

    it("should fail pagination if params are wrong", async () => {
      await expect(tir.getIssuers(1, 51)).to.be.revertedWith(
        "PageSize must be <= 50",
      );
      await expect(tir.getIssuers(1, 0)).to.be.revertedWith(
        "PageSize must be > 0",
      );
      await expect(tir.getIssuers(0, 1)).to.be.revertedWith("Page must be > 0");

      await expect(
        tir.getIssuerAttributeRevisions(randomHash(), 1, 51),
      ).to.be.revertedWith("PageSize must be <= 50");
      await expect(
        tir.getIssuerAttributeRevisions(randomHash(), 1, 0),
      ).to.be.revertedWith("PageSize must be > 0");
      await expect(
        tir.getIssuerAttributeRevisions(randomHash(), 0, 1),
      ).to.be.revertedWith("Page must be > 0");
    });

    it("should get issuers", async () => {
      await policyContractMock.setPolicyResult(true);

      // insert issuers
      const issuers: string[] = [];
      for (let i = 0; i < 18; i += 1) {
        issuers[i] = randomDid();
        const attrId = `0x${crypto.randomBytes(32).toString("hex")}`;

        await tir.setAttributeMetadata(
          issuers[i],
          attrId,
          IssuerType.RootTAO,
          issuers[i],
          attrId,
        );
      }

      // get issuers: page 1
      let issPagination = await tir.getIssuers(1, 5);
      expect(getEthObject(issPagination)).to.eql({
        howMany: ethers.BigNumber.from(5),
        items: issuers.slice(0, 5),
        next: ethers.BigNumber.from(2),
        prev: ethers.BigNumber.from(1),
        total: ethers.BigNumber.from(18),
      });

      // get issuers: page 2
      issPagination = await tir.getIssuers(2, 5);
      expect(getEthObject(issPagination)).to.eql({
        howMany: ethers.BigNumber.from(5),
        items: issuers.slice(5, 10),
        next: ethers.BigNumber.from(3),
        prev: ethers.BigNumber.from(1),
        total: ethers.BigNumber.from(18),
      });

      // get issuers: page 3
      issPagination = await tir.getIssuers(3, 5);
      expect(getEthObject(issPagination)).to.eql({
        howMany: ethers.BigNumber.from(5),
        items: issuers.slice(10, 15),
        next: ethers.BigNumber.from(4),
        prev: ethers.BigNumber.from(2),
        total: ethers.BigNumber.from(18),
      });

      // get issuers: page 4
      issPagination = await tir.getIssuers(4, 5);
      expect(getEthObject(issPagination)).to.eql({
        howMany: ethers.BigNumber.from(3),
        items: issuers.slice(15, 20),
        next: ethers.BigNumber.from(4),
        prev: ethers.BigNumber.from(3),
        total: ethers.BigNumber.from(18),
      });
    });

    it("should get latest metadata during setAttributeData", async () => {
      await registerRootTAO1();

      await policyContractMock.setPolicyResult(true);

      // revoke that attribute
      await tir.setAttributeMetadata(
        rootTAO1.did,
        rootTAO1.attributeId,
        IssuerType.Revoked,
        rootTAO1.did,
        rootTAO1.attributeId,
      );

      // fill the data
      const attr = `0x${crypto.randomBytes(10).toString("hex")}`;
      await tir.setAttributeData(rootTAO1.did, rootTAO1.attributeId, attr);

      // expect the attribute to be revoked
      const issuerHashes = await tir.getIssuer(rootTAO1.did);
      expect(issuerHashes).to.be.an("array");
      expect(issuerHashes).to.have.length(1);

      // get the second attribute
      const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
      expect(getEthObject(issuerAttr)).to.eql({
        attribData: attr,
        did: rootTAO1.did,
        issuerType: IssuerType.Revoked,
        rootTao: rootTAO1.did,
        tao: rootTAO1.did,
      });
    });

    it("should be able to revoke a RootTAO by an admin from TPR", async () => {
      await registerRootTAO1();

      await policyContractMock.setPolicyResult(true);

      // revoke that attribute
      await tir.setAttributeMetadata(
        rootTAO1.did,
        rootTAO1.attributeId,
        IssuerType.Revoked,
        rootTAO1.did,
        rootTAO1.attributeId,
      );

      // expect the attribute to be revoked
      const issuerHashes = await tir.getIssuer(rootTAO1.did);
      expect(issuerHashes).to.be.an("array");
      expect(issuerHashes).to.have.length(1);

      // get the second attribute
      const issuerAttr = await tir.getIssuerAttributeByHash(issuerHashes[0]);
      expect(getEthObject(issuerAttr)).to.eql({
        attribData: "0x",
        did: rootTAO1.did,
        issuerType: IssuerType.Revoked,
        rootTao: rootTAO1.did,
        tao: rootTAO1.did,
      });
    });

    it("should reject 2 dids with the same attribute", async () => {
      await registerRootTAO1();
      await policyContractMock.setPolicyResult(true);

      // create rootTAO
      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          rootTAO1.attributeId,
          IssuerType.TAO,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.be.revertedWith("attribute already stored");
    });

    it("should reject an update of an unknown attribute", async () => {
      await registerRootTAO1();
      await policyContractMock.setPolicyResult(true);

      // create rootTAO
      await expect(
        tir.setAttributeData(rootTAO1.did, tao1.attributeId, tao1.attribute),
      ).to.be.revertedWith("attributeId is not link to DID");
    });

    it("should reject invalid inputs for setAttributeMetadata", async () => {
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      await expect(
        tir.setAttributeMetadata(
          rootTAO1.did,
          rootTAO1.attributeId,
          IssuerType.Undefined,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.be.revertedWith("invalid issuerType");
    });

    it("should reject the get of an unknown attribute", async () => {
      await expect(
        tir.getIssuerAttributeByHash(randomHash()),
      ).to.be.revertedWith("attribute has not been found");
      await expect(
        tir.getIssuerAttributeRevisions(randomHash(), 1, 10),
      ).to.be.revertedWith("attribute has not been found");
    });

    it("should reject revision already stored", async () => {
      await registerRootTAO1();
      await expect(
        tir.setAttributeData(
          rootTAO1.did,
          rootTAO1.attributeId,
          rootTAO1.attribute,
        ),
      ).to.be.revertedWith("revision already stored");
    });

    it("A ROOT TAO can update the attribute metadata of a TI that was created by TAO", async () => {
      await policyContractMock.setPolicyResult(true); // is admin
      await didContractMock.setDidResult(true); // the admin is a controller

      await registerRootTAO1();
      await registerTAO1();

      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.TAO,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.emit(tir, "AddAttributeRevision");

      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId1,
          IssuerType.TI,
          tao1.did,
          tao1.attributeId,
        ),
      ).to.emit(tir, "AddAttributeRevision");

      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId1,
          IssuerType.TI,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.emit(tir, "AddAttributeRevision");
    });

    it("should reject invalid authorization for setAttributeData", async () => {
      await policyContractMock.setPolicyResult(true); // is admin
      await didContractMock.setDidResult(false); // the admin is not a controller

      // create rootTAO
      await expect(
        tir.setAttributeMetadata(
          rootTAO1.did,
          rootTAO1.attributeId,
          IssuerType.RootTAO,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.emit(tir, "AddAttributeRevision");

      // The admin cannot update data
      await expect(
        tir.setAttributeData(
          rootTAO1.did,
          rootTAO1.attributeId,
          rootTAO1.attribute,
        ),
      ).to.be.revertedWith("Not the issuer itself");
    });

    it("should reject invalid chain of trust", async () => {
      await policyContractMock.setPolicyResult(false); // not admin
      await didContractMock.setDidResult(true); // controller of the DID

      // RootTAO doesn't exist and tries to register a TAO
      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.TAO,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.be.revertedWith("issuer does not exist");

      await registerRootTAO1();
      await registerTAO1();
      await registerTAO2();
      await registerTI();

      // The TI cannot register another TI
      await expect(
        tir.setAttributeMetadata(
          "did:ebsi:newTI",
          `0x${crypto.randomBytes(32).toString("hex")}`,
          IssuerType.TI,
          ti1.did,
          ti1.attributeId1,
        ),
      ).to.be.revertedWith(
        "Policy error: sender is not TAO/RootTao it doesn't have the attribute TIR:setAttributeMetadata",
      );

      // A Root TAO cannot register another Root TAO
      await expect(
        tir.setAttributeMetadata(
          "did:ebsi:newRootTAO",
          `0x${crypto.randomBytes(32).toString("hex")}`,
          IssuerType.RootTAO,
          rootTAO1.did,
          rootTAO1.attributeId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:setAttributeMetadata",
      );

      // A third TAO cannot update attributes
      // TAO registers a TI
      await expect(
        tir.setAttributeMetadata(
          // TAO 2 adds a new attribute, this is OK
          ti1.did,
          ti1.attributeId2,
          IssuerType.TI,
          tao2.did,
          tao2.attributeId,
        ),
      ).to.emit(tir, "AddAttributeRevision");

      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId1,
          IssuerType.Revoked,
          tao2.did,
          tao2.attributeId,
        ),
      ).to.be.revertedWith(
        `Policy error: sender is not TAO/RootTao of current did ${ti1.did} and it doesn't have the attribute TIR:setAttributeMetadata`,
      );
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

    it("should reject add issuer proxy with the same data", async () => {
      // Focus only on proxy management logic regardless of policy and did validations.
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      await expect(tir.addIssuerProxy(didIssuer, proxyData1)).to.emit(
        tir,
        "AddIssuerProxy",
      );
      await expect(
        tir.addIssuerProxy(didIssuer, proxyData1),
      ).to.be.revertedWith("proxy already stored");
    });

    it("should reject to update an unknown proxy", async () => {
      // Focus only on proxy management logic regardless of policy and did validations.
      await policyContractMock.setPolicyResult(true);
      await didContractMock.setDidResult(true);

      const proxyId = `0x${crypto.randomBytes(32).toString("hex")}`;
      await expect(
        tir.updateIssuerProxy(didIssuer, proxyId, proxyData1),
      ).to.be.revertedWith("proxy not found");
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
      expect(proxyDataReturned).to.eq(proxyData1);
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

    it("should pass check controller when addIssuerProxy is called", async () => {
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(true);

      const randomDidResult = randomDid();

      await expect(tir.addIssuerProxy(randomDidResult, proxyData1)).to.emit(
        tir,
        "AddIssuerProxy",
      );
    });

    it("should check if it is a controller when updateIssuerProxy is called", async () => {
      await policyContractMock.setPolicyResult(false);
      await didContractMock.setDidResult(true);

      await tir.addIssuerProxy(didIssuer, proxyData1);
      const [proxyId] = await tir.getIssuerProxies(didIssuer);

      const proxyData = randomProxy();

      await expect(
        tir.updateIssuerProxy(didIssuer, proxyId, proxyData),
      ).to.emit(tir, "UpdateIssuerProxy");
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
