import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { ContractFactory } from "ethers";

import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { randomBytes } from "node:crypto";

import type {
  DidRegistryMock,
  PolicyRegistryMock,
  TrustedIssuersRegistry,
} from "../src/types";

import { testDidrAddress, testTprAddress } from "./testAddress";

enum IssuerType {
  Undefined,
  RootTAO,
  TAO,
  TI,
  Revoked,
}

function randomBytesHex(length: number) {
  return `0x${randomBytes(length).toString("hex")}`;
}

const createData = (did: string) => {
  const issuer = {
    attributeData: randomBytesHex(100),
    attributeId: randomBytesHex(32),
    did,
    proxyData: `{ test - ${randomBytes(10).toString("base64")} }`,
    proxyId: "",
    revisionId: "",
  };
  issuer.revisionId = ethers.sha256(issuer.attributeData);
  issuer.proxyId = ethers.sha256(Buffer.from(issuer.proxyData));
  return issuer;
};

const rootTao1 = createData("did:ebsi:roottao1");
const tao1 = createData("did:ebsi:tao1");
const tao2 = createData("did:ebsi:tao2");
const ti1 = createData("did:ebsi:ti1");
const ti2 = createData("did:ebsi:ti2");

describe("Trusted Issuers Registry", () => {
  let tir: TrustedIssuersRegistry;
  let tprMock: PolicyRegistryMock;
  let didrMock: DidRegistryMock;
  let contractFactory: ContractFactory;
  let upgrader: SignerWithAddress;
  let admin: SignerWithAddress;

  before(async () => {
    [upgrader, admin] = await ethers.getSigners();
    // deploy TPR mock
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    const tempPolicyContract = await policyRegistryFactory.deploy();
    let bytecode = await ethers.provider.getCode(
      await tempPolicyContract.getAddress(),
    );
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    tprMock = policyRegistryFactory.attach(
      testTprAddress,
    ) as PolicyRegistryMock;

    // deploy DID Registry mock
    const didRegistryFactory =
      await ethers.getContractFactory("DidRegistryMock");
    const tempDidContract = await didRegistryFactory.deploy();
    bytecode = await ethers.provider.getCode(
      await tempDidContract.getAddress(),
    );
    await network.provider.send("hardhat_setCode", [testDidrAddress, bytecode]);
    didrMock = didRegistryFactory.attach(testDidrAddress) as DidRegistryMock;

    contractFactory = await ethers.getContractFactory(
      "TrustedIssuersRegistry",
      upgrader,
    );
    tir = (
      (await upgrades.deployProxy(
        contractFactory,
        [upgrader.address, testTprAddress, testDidrAddress],
        { unsafeAllowLinkedLibraries: true },
      )) as unknown as TrustedIssuersRegistry
    ).connect(admin);
  });

  beforeEach(async () => {
    await tprMock.setPolicyResult(false);
    await didrMock.setDidResult(false);
  });

  it("should be already initialized", async () => {
    const newUpgrader = "0xbBfe1fEf1cdF1Edf742922ED55c054b00e05f0eB";
    const newTpr = "0x4D82b508f5EE854E7D04192fFc8986cE3F15818E";
    const newDidr = "0x3168c644B66CF851e85b8801Ea1C9a4b72731bf1";
    await expect(
      tir.initialize(newUpgrader, newTpr, newDidr),
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  describe("Upgrade contract", () => {
    it("should fail if user is not upgrader", async () => {
      const newImplementation = await contractFactory.deploy();
      await expect(
        tir.upgradeTo(await newImplementation.getAddress()),
      ).to.be.revertedWith("not upgrader");
    });

    it("should upgrade contract with a new implementation", async () => {
      const newImplementation = await contractFactory.deploy();
      const tirWithUpgrader = tir.connect(upgrader);
      await tirWithUpgrader.upgradeTo(await newImplementation.getAddress());
    });
  });

  describe("Set attribute metadata", () => {
    it("should fail when user does not have attribute in TPR", async () => {
      await expect(
        tir.setAttributeMetadata(
          rootTao1.did,
          rootTao1.attributeId,
          IssuerType.RootTAO,
          rootTao1.did,
          rootTao1.attributeId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender doesn't have the attribute TIR:setAttributeMetadata",
      );
    });

    it("should fail when the arguments are invalid for root tao", async () => {
      await tprMock.setPolicyResult(true);
      await expect(
        tir.setAttributeMetadata(
          rootTao1.did,
          rootTao1.attributeId,
          IssuerType.RootTAO,
          "unknown",
          rootTao1.attributeId,
        ),
      ).to.be.revertedWith("did and taoDid must be the same for RootTAO");
    });

    it("should insert a new root tao and emit", async () => {
      await tprMock.setPolicyResult(true);

      await expect(
        tir.setAttributeMetadata(
          rootTao1.did,
          rootTao1.attributeId,
          IssuerType.RootTAO,
          rootTao1.did,
          rootTao1.attributeId,
        ),
      )
        .to.emit(tir, "AttributeMetadataUpdated")
        .withArgs(
          [
            rootTao1.did, // did
            rootTao1.attributeId, // attributeId
            IssuerType.RootTAO, // issuerType
            rootTao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          rootTao1.attributeId,
        );
    });

    it("should fail if parent does not exist", async () => {
      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.TAO,
          "unknown",
          rootTao1.attributeId,
        ),
      ).to.be.revertedWith("taoDid not linked with attributeIdTao");
    });

    it("should fail if the parent's attribute does not exist", async () => {
      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.TAO,
          rootTao1.did,
          randomBytesHex(32),
        ),
      ).to.be.revertedWith("Policy error: attributeIdTao is not TAO/RootTao");
    });

    it("should insert a new tao and emit", async () => {
      await didrMock.setDidResult(true);

      // tao 1
      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.TAO,
          rootTao1.did,
          rootTao1.attributeId,
        ),
      )
        .to.emit(tir, "AttributeMetadataUpdated")
        .withArgs(
          [
            tao1.did, // did
            tao1.attributeId, // attributeId
            IssuerType.TAO, // issuerType
            rootTao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          tao1.attributeId,
        );

      // tao 2
      await expect(
        tir.setAttributeMetadata(
          tao2.did,
          tao2.attributeId,
          IssuerType.TAO,
          rootTao1.did,
          rootTao1.attributeId,
        ),
      )
        .to.emit(tir, "AttributeMetadataUpdated")
        .withArgs(
          [
            tao2.did, // did
            tao2.attributeId, // attributeId
            IssuerType.TAO, // issuerType
            rootTao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          tao2.attributeId,
        );
    });

    it("should insert a new ti and emit", async () => {
      await didrMock.setDidResult(true);
      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId,
          IssuerType.TI,
          tao1.did,
          tao1.attributeId,
        ),
      )
        .to.emit(tir, "AttributeMetadataUpdated")
        .withArgs(
          [
            ti1.did, // did
            ti1.attributeId, // attributeId
            IssuerType.TI, // issuerType
            tao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          ti1.attributeId,
        );
    });

    it("should fail if parent is not tao or root tao", async () => {
      await didrMock.setDidResult(true);
      await expect(
        tir.setAttributeMetadata(
          ti2.did,
          ti2.attributeId,
          IssuerType.TI,
          ti1.did,
          ti2.attributeId,
        ),
      ).to.be.revertedWith("Policy error: attributeIdTao is not TAO/RootTao");
    });

    it("should fail when the trust of chain is not correct", async () => {
      await didrMock.setDidResult(true);
      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId,
          IssuerType.Revoked,
          tao2.did, // tao2 is not the parent of ti1
          tao2.attributeId,
        ),
      ).to.be.revertedWith(
        "Policy error: taoDid is not TAO/RootTao of the current did",
      );
    });

    it("should revert impersonations", async () => {
      await didrMock.setDidResult(false); // impersonation (not tao1)
      await expect(
        tir.setAttributeMetadata(
          ti1.did,
          ti1.attributeId,
          IssuerType.Revoked,
          tao1.did,
          tao1.attributeId,
        ),
      ).to.be.revertedWith(
        "Policy error: sender is not did:ebsi:tao1 and it doesn't have the attribute TIR:setAttributeMetadata",
      );
    });

    it("should reject invalid arguments when updating attributes", async () => {
      await expect(
        tir.setAttributeMetadata(
          ti2.did, // not link between did and attributeId
          ti1.attributeId,
          IssuerType.Revoked,
          tao1.did,
          tao1.attributeId,
        ),
      ).to.be.revertedWith("revisionId is linked to a different did");
    });

    it("should revoke a tao and emit", async () => {
      await didrMock.setDidResult(true);

      await expect(
        tir.setAttributeMetadata(
          tao1.did,
          tao1.attributeId,
          IssuerType.Revoked,
          rootTao1.did,
          rootTao1.attributeId,
        ),
      )
        .to.emit(tir, "AttributeMetadataUpdated")
        .withArgs(
          [
            tao1.did, // did
            tao1.attributeId, // attributeId
            IssuerType.Revoked, // issuerType
            rootTao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          anyValue, // newRevisionId = sha256(block.timestamp, did, attributeId)
        );
    });

    it("should revoke a root tao and emit", async () => {
      await tprMock.setPolicyResult(true);
      await expect(
        tir.setAttributeMetadata(
          rootTao1.did,
          rootTao1.attributeId,
          IssuerType.Revoked,
          rootTao1.did,
          rootTao1.attributeId,
        ),
      )
        .to.emit(tir, "AttributeMetadataUpdated")
        .withArgs(
          [
            rootTao1.did, // did
            rootTao1.attributeId, // attributeId
            IssuerType.Revoked, // issuerType
            rootTao1.did, // taoDid:
            rootTao1.did, // rootTaoDid
          ],
          anyValue, // newRevisionId = sha256(block.timestamp, did, attributeId)
        );
    });
  });

  describe("Set attribute data", () => {
    it("should revert impersonations", async () => {
      await didrMock.setDidResult(false); // impersonation (not ti1)
      await expect(
        tir.setAttributeData(ti1.did, ti1.attributeId, ti1.attributeData),
      ).to.be.revertedWith(
        "Policy error: sender is not controller of the did did:ebsi:ti1 and it doesn't have the attribute TIR:updateIssuer",
      );
    });

    it("should revert unknown attributes", async () => {
      await didrMock.setDidResult(true);
      await expect(
        tir.setAttributeData(ti1.did, randomBytesHex(32), ti1.attributeData),
      ).to.be.revertedWith("did not linked with attributeId");

      await expect(
        tir.setAttributeData("unknown", ti1.attributeId, ti1.attributeData),
      ).to.be.revertedWith("did not linked with attributeId");
    });

    it("should set attribute data", async () => {
      await didrMock.setDidResult(true);
      await expect(
        tir.setAttributeData(ti1.did, ti1.attributeId, ti1.attributeData),
      )
        .to.emit(tir, "AttributeDataUpdated")
        .withArgs(
          [
            ti1.did, // did
            ti1.attributeId, // attributeId
            IssuerType.TI, // issuerType
            tao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          ethers.sha256(ti1.attributeData),
          ti1.attributeData,
        );
    });

    it("should set attribute data if the user is authorized in TPR", async () => {
      await tprMock.setPolicyResult(true);
      await expect(
        tir.setAttributeData(ti1.did, ti1.attributeId, ti1.attributeData),
      )
        .to.emit(tir, "AttributeDataUpdated")
        .withArgs(
          [
            ti1.did, // did
            ti1.attributeId, // attributeId
            IssuerType.TI, // issuerType
            tao1.did, // taoDid
            rootTao1.did, // rootTaoDid
          ],
          ethers.sha256(ti1.attributeData),
          ti1.attributeData,
        );
    });
  });

  describe("Proxies", () => {
    it("should revert unknown dids", async () => {
      await didrMock.setDidResult(true);
      await expect(
        tir.addIssuerProxy("unknown-did", ti1.proxyData),
      ).to.be.revertedWith("issuer does not exist");
    });

    it("should revert impersonations", async () => {
      await didrMock.setDidResult(false); // impersonation (not ti1)
      await expect(
        tir.addIssuerProxy(ti1.did, ti1.proxyData),
      ).to.be.revertedWith(
        "Policy error: sender is not controller of the did did:ebsi:ti1 and it doesn't have the attribute TIR:updateIssuer",
      );
    });

    it("should add an issuer proxy", async () => {
      await didrMock.setDidResult(true);
      await expect(tir.addIssuerProxy(ti1.did, ti1.proxyData))
        .to.emit(tir, "ProxyUpdated")
        .withArgs(ti1.did, ti1.proxyId, ti1.proxyData);
    });

    it("should revert impersonations during updates", async () => {
      await didrMock.setDidResult(false); // impersonation (not ti1)
      await expect(
        tir.updateIssuerProxy(ti1.did, ti1.proxyId, ti1.proxyData),
      ).to.be.revertedWith(
        "Policy error: sender is not controller of the did did:ebsi:ti1 and it doesn't have the attribute TIR:updateIssuer",
      );
    });

    it("should update an issuer proxy", async () => {
      await didrMock.setDidResult(true);
      const newData = randomBytesHex(100);
      await expect(tir.updateIssuerProxy(ti1.did, ti1.proxyId, newData))
        .to.emit(tir, "ProxyUpdated")
        .withArgs(ti1.did, ti1.proxyId, newData);
    });

    it("should remove an issuer proxy", async () => {
      await didrMock.setDidResult(true);
      await expect(tir.removeIssuerProxy(ti1.did, ti1.proxyId))
        .to.emit(tir, "ProxyRemoved")
        .withArgs(ti1.did, ti1.proxyId);
    });
  });
});
