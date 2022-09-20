import { ethers, network, config } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DidRegistry, PolicyRegistryMock } from "../src/types";
import { testTprAddress } from "./testAddress";
import { getEthObject } from "./utils";

type InsertDidDocumentArgs = [
  string,
  string,
  string,
  string,
  boolean,
  number,
  number
];
type AddVerificationMethodArgs = [string, string, string, boolean];
type AddVerificationRelationshipArgs = [string, string, string, number, number];

describe("Did Documents", () => {
  let reg: DidRegistry;
  let policyContractMock: PolicyRegistryMock;

  const acc = config.networks.hardhat.accounts as { mnemonic: string };
  const hd = ethers.utils.HDNode.fromMnemonic(acc.mnemonic);

  let user = new ethers.Wallet(hd.derivePath("m/44'/60'/0'/0/1").privateKey);
  let user2: SignerWithAddress;
  const did = "did:ebsi:zpUnevx4dP2R2BvbjFEnnFF";
  const baseDocument =
    '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}';
  const vMethodId = "H5RhB6vyFgl2Uizk8IjL_9AkB5mfqgn5ApgfHUbkqdQ";
  const notBefore = 1000;
  const notAfter = 2000;

  before(async () => {
    const signers = await ethers.getSigners();
    const admin = signers[0];
    if (!admin.provider) throw new Error("provider not defined");
    user = user.connect(admin.provider);
    [, , user2] = signers;

    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);

    policyContractMock = policyRegistryFactory.attach(
      testTprAddress
    ) as PolicyRegistryMock;
  });

  beforeEach(async () => {
    const didDocumentFactory = await ethers.getContractFactory(
      "DidDocumentLib"
    );
    const didDocumentLib = await didDocumentFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        DidDocumentLib: didDocumentLib.address,
      },
    });

    reg = (await contractFactory.deploy()).connect(user) as DidRegistry;

    await reg.initialize(42);
    await reg.setTrustedPoliciesRegistryAddress();
    await policyContractMock.setPolicyResult(false);
    const initialVersion = await reg.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(reg.address).to.be.properAddress;
  });

  it("should insertDidDocument", async () => {
    await expect(
      reg.insertDidDocument(
        did,
        baseDocument,
        vMethodId,
        user.publicKey,
        true,
        notBefore,
        notAfter
      )
    ).to.emit(reg, "DidDocumentInserted");
  });

  it("should reject bad params for insertDidDocument", async () => {
    const args: InsertDidDocumentArgs = [
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    ];

    args[0] = "";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid did"
    );
    args[0] = did;

    args[1] = "";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid baseDocument"
    );
    args[1] = baseDocument;

    args[2] = "";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid vMethodId"
    );
    args[2] = vMethodId;

    args[3] = "0x";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid publicKey"
    );
    args[3] = user.publicKey;

    args[4] = false;
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "first publicKey must be for secp256k1"
    );
    args[4] = true;

    args[5] = notAfter + 10;
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid dates"
    );
  });

  it("should reject insertDidDocument if the did already exist", async () => {
    const args: InsertDidDocumentArgs = [
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    ];
    await expect(reg.insertDidDocument(...args)).to.emit(
      reg,
      "DidDocumentInserted"
    );

    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "did already exist"
    );
  });

  it("should update baseDocument", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await expect(reg.updateBaseDocument(did, "{}")).to.emit(
      reg,
      "BaseDocumentUpdated"
    );
  });

  it("should check access control for updateBaseDocument", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    // restriction to user2
    await expect(
      reg.connect(user2).updateBaseDocument(did, "{}")
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:updateBaseDocument"
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(reg.connect(user2).updateBaseDocument(did, "{}")).to.emit(
      reg,
      "BaseDocumentUpdated"
    );
  });

  it("should reject bad params of updateBaseDocument", async () => {
    await expect(
      reg.connect(user2).updateBaseDocument("did:ebsi:unknown", "{}")
    ).to.be.revertedWith("did doesn't exist");
  });

  it("should add a controller", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await reg.insertDidDocument(
      "did:ebsi:new_controller",
      baseDocument,
      vMethodId,
      ethers.Wallet.createRandom().publicKey,
      true,
      notBefore,
      notAfter
    );
    await expect(reg.addController(did, "did:ebsi:new_controller")).to.emit(
      reg,
      "ControllerAdded"
    );
  });

  it("should check access control for addController", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await reg.insertDidDocument(
      "did:ebsi:new_controller",
      baseDocument,
      vMethodId,
      ethers.Wallet.createRandom().publicKey,
      true,
      notBefore,
      notAfter
    );

    // restriction to user2
    await expect(
      reg.connect(user2).addController(did, "did:ebsi:new_controller")
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:addController"
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg.connect(user2).addController(did, "did:ebsi:new_controller")
    ).to.emit(reg, "ControllerAdded");
  });

  it("should reject bad params of addController", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    await expect(
      reg.addController("did:ebsi:unknown", "did:ebsi:new_controller")
    ).to.be.revertedWith("did doesn't exist");

    await expect(reg.addController(did, "did:ebsi:unknown")).to.be.revertedWith(
      "controller doesn't exist"
    );

    await expect(reg.addController(did, did)).to.be.revertedWith(
      "it is already a controller"
    );
  });

  it("should revoke a controller", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await expect(reg.revokeController(did, did)).to.emit(
      reg,
      "ControllerRevoked"
    );
    await expect(reg.revokeController(did, did)).to.be.revertedWith(
      "not controller and not authorized for policy DID:revokeController"
    );
  });

  it("should check access control for revokeController", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    // restriction to user2
    await expect(
      reg.connect(user2).revokeController(did, did)
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:revokeController"
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(reg.connect(user2).revokeController(did, did)).to.emit(
      reg,
      "ControllerRevoked"
    );
  });

  it("should reject bad params of revokeController", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    await expect(
      reg.revokeController("did:ebsi:unknown", "did:ebsi:unknown")
    ).to.be.revertedWith("did doesn't exist");

    await expect(
      reg.revokeController(did, "did:ebsi:unknown")
    ).to.be.revertedWith("controller not found");
  });

  it("should add a verification method", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await expect(
      reg.addVerificationMethod(
        did,
        "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE",
        user.publicKey,
        true
      )
    ).to.emit(reg, "VerificationMethodAdded");
  });

  it("should check access control for addVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    // restriction to user2
    await expect(
      reg
        .connect(user2)
        .addVerificationMethod(
          did,
          "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE",
          user.publicKey,
          true
        )
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:addVerificationMethod"
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg
        .connect(user2)
        .addVerificationMethod(
          did,
          "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE",
          user.publicKey,
          true
        )
    ).to.emit(reg, "VerificationMethodAdded");
  });

  it("should reject bad params of addVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    const newVMethodId = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";

    const args: AddVerificationMethodArgs = [
      did,
      newVMethodId,
      user.publicKey,
      true,
    ];

    args[0] = "did:ebsi:unknown";
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "did doesn't exist"
    );
    args[0] = did;

    args[1] = "";
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "invalid vMethodId"
    );
    args[1] = vMethodId;
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "vMethodId already exist"
    );
    args[1] = newVMethodId;

    args[2] = "0x";
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "invalid publicKey"
    );
  });

  it("should add a verification relationship", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await expect(
      reg.addVerificationRelationship(
        did,
        "assertionMethod",
        vMethodId,
        notBefore,
        notAfter
      )
    ).to.emit(reg, "VerificationRelationshipAdded");
  });

  it("should check access control for addVerificationRelationship", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    // restriction to user2
    await expect(
      reg
        .connect(user2)
        .addVerificationRelationship(
          did,
          "assertionMethod",
          vMethodId,
          notBefore,
          notAfter
        )
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:addVerificationRelationship"
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg
        .connect(user2)
        .addVerificationRelationship(
          did,
          "assertionMethod",
          vMethodId,
          notBefore,
          notAfter
        )
    ).to.emit(reg, "VerificationRelationshipAdded");
  });

  it("should reject bad params of addVerificationRelationship", async () => {
    const name = "assertionMethod";
    const args: AddVerificationRelationshipArgs = [
      did,
      name,
      vMethodId,
      notBefore,
      notAfter,
    ];

    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );

    await reg.addVerificationRelationship(
      did,
      "assertionMethod",
      vMethodId,
      notBefore,
      notAfter
    );

    args[0] = "";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "did doesn't exist"
    );
    args[0] = "did:ebsi:unknown";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "did doesn't exist"
    );
    args[0] = did;

    args[1] = "";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "invalid name"
    );
    args[1] = "capabilityInvocation";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "capabilityInvocation already exist"
    );
    args[1] = "assertionMethod";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "relationship already exist"
    );
    args[1] = name;

    args[2] = "";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "vMethodId doesn't exist"
    );
    args[2] = "unknown method";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "vMethodId doesn't exist"
    );
    args[2] = vMethodId;

    args[3] = notAfter + 10;
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "invalid dates"
    );
  });

  it("should follow expected usage flow", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
    await reg.addVerificationRelationship(
      did,
      "assertionMethod",
      vMethodId,
      notBefore,
      notAfter
    );

    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}'
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";
    await reg.addVerificationMethod(did, vMethodId2, publicKey2, false);
    await reg.addVerificationRelationship(
      did,
      "assertionMethod",
      vMethodId2,
      notBefore,
      notAfter
    );

    const didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId, vMethodId2],
      vMethods: [
        {
          publicKey: user.publicKey,
          isSecp256k1: true,
          revoked: false,
        },
        {
          publicKey: `0x${publicKey2.toString("hex")}`,
          isSecp256k1: false,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "assertionMethod",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
        },
        {
          name: "assertionMethod",
          vMethodId: vMethodId2,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
        },
      ],
    });
  });
});
