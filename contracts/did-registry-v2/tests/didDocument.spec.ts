import { ethers, network, config } from "hardhat";
import { expect } from "chai";
import type {
  DidRegistry,
  PolicyRegistryMock,
  DidRegistryMock,
} from "../src/types";
import { testTprAddress, testDidV3Address } from "./testAddress";
import { getEthObject } from "./utils";

type InsertDidDocumentArgs = [
  string,
  string,
  string,
  string,
  boolean,
  number,
  number,
];
type AddVerificationMethodArgs = [string, string, string, boolean];
type AddVerificationRelationshipArgs = [string, string, string, number, number];

describe("Did Documents", () => {
  let reg: DidRegistry;
  let policyContractMock: PolicyRegistryMock;
  let didV3ContractMock: DidRegistryMock;

  const acc = config.networks.hardhat.accounts as { mnemonic: string };
  const hd = ethers.utils.HDNode.fromMnemonic(acc.mnemonic);

  let user = new ethers.Wallet(hd.derivePath("m/44'/60'/0'/0/1").privateKey);
  let user2 = new ethers.Wallet(hd.derivePath("m/44'/60'/0'/0/2").privateKey);
  let user3 = new ethers.Wallet(hd.derivePath("m/44'/60'/0'/0/3").privateKey);
  const did = "did:ebsi:zpUnevx4dP2R2BvbjFEnnFF";
  const baseDocument =
    '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}';
  const vMethodId = "H5RhB6vyFgl2Uizk8IjL_9AkB5mfqgn5ApgfHUbkqdQ";
  const notBefore = Math.floor(Date.now() / 1000);
  const notAfter = notBefore + 3600;

  before(async () => {
    const signers = await ethers.getSigners();
    const admin = signers[0];
    if (!admin.provider) throw new Error("provider not defined");
    user = user.connect(admin.provider);
    user2 = user2.connect(admin.provider);
    user3 = user3.connect(admin.provider);

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

    const didRegistryV1Factory =
      await ethers.getContractFactory("DidRegistryMock");
    const tempDidContract = await didRegistryV1Factory.deploy();
    await tempDidContract.deployed();
    const bytecodeDid = await ethers.provider.getCode(tempDidContract.address);
    await network.provider.send("hardhat_setCode", [
      testDidV3Address,
      bytecodeDid,
    ]);

    didV3ContractMock = didRegistryV1Factory.attach(testDidV3Address);
  });

  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();

    const vRelationshipsFactory =
      await ethers.getContractFactory("VRelationshipsLib");
    const vRelationshipsLib = await vRelationshipsFactory.deploy();

    const didDocumentFactory = await ethers.getContractFactory(
      "DidDocumentLib",
      {
        libraries: {
          Pagination: paginationLib.address,
          VRelationshipsLib: vRelationshipsLib.address,
        },
      },
    );
    const didDocumentLib = await didDocumentFactory.deploy();

    const controllersFactory = await ethers.getContractFactory(
      "ControllersLib",
      {
        libraries: {
          Pagination: paginationLib.address,
        },
      },
    );
    const controllersLib = await controllersFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        DidDocumentLib: didDocumentLib.address,
        ControllersLib: controllersLib.address,
        VRelationshipsLib: vRelationshipsLib.address,
      },
    });

    reg = (
      await contractFactory.deploy(testTprAddress, testDidV3Address)
    ).connect(user);

    await reg.initialize(42);
    await reg.setRegistryAddresses();
    await policyContractMock.setPolicyResult(false);
    await didV3ContractMock.setDidResult(false);
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
        notAfter,
      ),
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
      "invalid did",
    );
    args[0] = did;

    args[1] = "";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid baseDocument",
    );
    args[1] = baseDocument;

    args[2] = "";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid vMethodId",
    );
    args[2] = vMethodId;

    args[3] = "0x";
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid publicKey",
    );
    args[3] = user.publicKey;

    args[4] = false;
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "first publicKey must be for secp256k1",
    );
    args[4] = true;

    args[5] = notAfter + 10;
    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "invalid dates",
    );
  });

  it("should reject insertDidDocument if the did already exists", async () => {
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
      "DidDocumentInserted",
    );

    await expect(reg.insertDidDocument(...args)).to.be.revertedWith(
      "did already exists",
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
      notAfter,
    );
    await expect(reg.updateBaseDocument(did, "{}")).to.emit(
      reg,
      "BaseDocumentUpdated",
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
      notAfter,
    );

    // restriction to user2
    await expect(
      reg.connect(user2).updateBaseDocument(did, "{}"),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:updateBaseDocument",
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(reg.connect(user2).updateBaseDocument(did, "{}")).to.emit(
      reg,
      "BaseDocumentUpdated",
    );
  });

  it("should reject bad params of updateBaseDocument", async () => {
    await expect(
      reg.connect(user2).updateBaseDocument("did:ebsi:unknown", "{}"),
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
      notAfter,
    );
    await reg.insertDidDocument(
      "did:ebsi:new_controller",
      baseDocument,
      vMethodId,
      ethers.Wallet.createRandom().publicKey,
      true,
      notBefore,
      notAfter,
    );
    await expect(reg.addController(did, "did:ebsi:new_controller")).to.emit(
      reg,
      "ControllerAdded",
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
      notAfter,
    );
    await reg.insertDidDocument(
      "did:ebsi:new_controller",
      baseDocument,
      vMethodId,
      ethers.Wallet.createRandom().publicKey,
      true,
      notBefore,
      notAfter,
    );

    // restriction to user2
    await expect(
      reg.connect(user2).addController(did, "did:ebsi:new_controller"),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:addController",
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg.connect(user2).addController(did, "did:ebsi:new_controller"),
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
      notAfter,
    );

    await expect(
      reg.addController("did:ebsi:unknown", "did:ebsi:new_controller"),
    ).to.be.revertedWith("did doesn't exist");

    await expect(reg.addController(did, "did:ebsi:unknown")).to.be.revertedWith(
      "controller doesn't exist",
    );

    await expect(reg.addController(did, did)).to.be.revertedWith(
      "it is already a controller",
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
      notAfter,
    );
    await reg.insertDidDocument(
      "did:ebsi:c2",
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );
    await reg.addController(did, "did:ebsi:c2");
    await expect(reg.revokeController(did, did)).to.emit(
      reg,
      "ControllerRevoked",
    );
    await expect(reg.revokeController(did, did)).to.be.revertedWith(
      "controller not found",
    );

    const didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: ["did:ebsi:c2"],
      vMethodIds: [vMethodId],
      vMethods: [
        {
          publicKey: user.publicKey,
          isSecp256k1: true,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
      ],
    });
  });

  it("should check access control for revokeController", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    // restriction to user2
    await expect(
      reg.connect(user2).revokeController(did, did),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:revokeController",
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(reg.connect(user2).revokeController(did, did)).to.emit(
      reg,
      "ControllerRevoked",
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
      notAfter,
    );

    await expect(
      reg.revokeController("did:ebsi:unknown", "did:ebsi:unknown"),
    ).to.be.revertedWith("did doesn't exist");

    await expect(
      reg.revokeController(did, "did:ebsi:unknown"),
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
      notAfter,
    );
    await expect(
      reg.addVerificationMethod(
        did,
        "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE",
        user.publicKey,
        true,
      ),
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
      notAfter,
    );

    // restriction to user2
    await expect(
      reg
        .connect(user2)
        .addVerificationMethod(
          did,
          "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE",
          user.publicKey,
          true,
        ),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:addVerificationMethod",
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
          true,
        ),
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
      notAfter,
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
      "did doesn't exist",
    );
    args[0] = did;

    args[1] = "";
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "invalid vMethodId",
    );
    args[1] = vMethodId;
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "vMethodId already exists",
    );
    args[1] = newVMethodId;

    args[2] = "0x";
    await expect(reg.addVerificationMethod(...args)).to.be.revertedWith(
      "invalid publicKey",
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
      notAfter,
    );
    await expect(
      reg.addVerificationRelationship(
        did,
        "assertionMethod",
        vMethodId,
        notBefore,
        notAfter,
      ),
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
      notAfter,
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
          notAfter,
        ),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:addVerificationRelationship",
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
          notAfter,
        ),
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
      notAfter,
    );

    await reg.addVerificationRelationship(
      did,
      "assertionMethod",
      vMethodId,
      notBefore,
      notAfter,
    );

    args[0] = "";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "did doesn't exist",
    );
    args[0] = "did:ebsi:unknown";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "did doesn't exist",
    );
    args[0] = did;

    args[1] = "";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "invalid name",
    );
    args[1] = "capabilityInvocation";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "capabilityInvocation already exists",
    );
    args[1] = "assertionMethod";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "relationship already exists",
    );
    args[1] = name;

    args[2] = "";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "vMethodId doesn't exist",
    );
    args[2] = "unknown method";
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "vMethodId doesn't exist",
    );
    args[2] = vMethodId;

    args[3] = notAfter + 10;
    await expect(reg.addVerificationRelationship(...args)).to.be.revertedWith(
      "invalid dates",
    );
  });

  it("should revoke a verification method", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    await expect(reg.revokeVerificationMethod(did, vMethodId, 3000)).to.emit(
      reg,
      "VerificationMethodRevoked",
    );

    const didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [],
      vMethods: [],
      vRelationships: [],
    });
  });

  it("should check access control for revokeVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    // restriction to user2
    await expect(
      reg.connect(user2).revokeVerificationMethod(did, vMethodId, 3000),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:revokeVerificationMethod",
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg.connect(user2).revokeVerificationMethod(did, vMethodId, 3000),
    ).to.emit(reg, "VerificationMethodRevoked");
  });

  it("should reject bad params of revokeVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    await expect(
      reg.revokeVerificationMethod("did:ebsi:unknown", vMethodId, 3000),
    ).to.be.revertedWith("did doesn't exist");

    await expect(
      reg.revokeVerificationMethod(did, "unknown", 3000),
    ).to.be.revertedWith("vMethodId doesn't exist");

    await expect(
      reg.revokeVerificationMethod(did, vMethodId, notAfter + 3600),
    ).to.be.revertedWith("invalid notAfter");

    // try to revoke 2 times
    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";
    await reg.addVerificationMethod(did, vMethodId2, publicKey2, false);
    await reg.revokeVerificationMethod(did, vMethodId2, notBefore + 1);
    await expect(
      reg.revokeVerificationMethod(did, vMethodId2, notBefore - 1),
    ).to.be.revertedWith("vMethodId already revoked");
  });

  it("should expire a verification method", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    await expect(
      reg.expireVerificationMethod(did, vMethodId, notAfter + 3000),
    ).to.emit(reg, "VerificationMethodExpired");

    const didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId],
      vMethods: [
        {
          publicKey: user.publicKey,
          isSecp256k1: true,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter + 3000).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter + 3000).toString(),
          indexDid: "0",
        },
      ],
    });
  });

  it("should check access control for expireVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    // restriction to user2
    await expect(
      reg
        .connect(user2)
        .expireVerificationMethod(did, vMethodId, notAfter + 3000),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:expireVerificationMethod",
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg
        .connect(user2)
        .expireVerificationMethod(did, vMethodId, notAfter + 3000),
    ).to.emit(reg, "VerificationMethodExpired");
  });

  it("should reject bad params of expireVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    await expect(
      reg.expireVerificationMethod(
        "did:ebsi:unknown",
        vMethodId,
        notBefore + 3000,
      ),
    ).to.be.revertedWith("did doesn't exist");

    await expect(
      reg.expireVerificationMethod(did, "unknown", notBefore + 3000),
    ).to.be.revertedWith("vMethodId doesn't exist");

    await expect(
      reg.expireVerificationMethod(did, vMethodId, notBefore - 3600),
    ).to.be.revertedWith("invalid notAfter");
  });

  it("should roll a verification method", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";
    const newNotBefore = notBefore + 2;
    const newNotAfter = newNotBefore + 5000;

    await expect(
      reg.rollVerificationMethod(
        did,
        vMethodId2,
        publicKey2,
        false,
        newNotBefore,
        newNotAfter,
        vMethodId,
        0,
      ),
    ).to.emit(reg, "VerificationMethodRolled");

    const didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId2],
      vMethods: [
        {
          publicKey: `0x${publicKey2.toString("hex")}`,
          isSecp256k1: false,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId: vMethodId2,
          notBefore: Number(newNotBefore).toString(),
          notAfter: Number(newNotAfter).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId: vMethodId2,
          notBefore: Number(newNotBefore).toString(),
          notAfter: Number(newNotAfter).toString(),
          indexDid: "0",
        },
      ],
    });
  });

  it("should roll a verification method with a transition period", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";
    const newNotBefore = notBefore + 2;
    const newNotAfter = newNotBefore + 5000;

    await expect(
      reg.rollVerificationMethod(
        did,
        vMethodId2,
        publicKey2,
        false,
        newNotBefore,
        newNotAfter,
        vMethodId,
        1234,
      ),
    ).to.emit(reg, "VerificationMethodRolled");

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
          name: "authentication",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(newNotBefore + 1234).toString(),
          indexDid: "0",
        },
        {
          name: "authentication",
          vMethodId: vMethodId2,
          notBefore: Number(newNotBefore).toString(),
          notAfter: Number(newNotAfter).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(newNotBefore + 1234).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId: vMethodId2,
          notBefore: Number(newNotBefore).toString(),
          notAfter: Number(newNotAfter).toString(),
          indexDid: "0",
        },
      ],
    });
  });

  it("should check access controll for rollVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";

    // restriction to user2
    await expect(
      reg
        .connect(user2)
        .rollVerificationMethod(
          did,
          vMethodId2,
          publicKey2,
          false,
          notBefore,
          notAfter + 3600,
          vMethodId,
          0,
        ),
    ).to.be.revertedWith(
      "not controller and not authorized for policy DID:rollVerificationMethod",
    );

    // user2 can update if it's in the TPR
    await policyContractMock.setPolicyResult(true);
    await expect(
      reg
        .connect(user2)
        .rollVerificationMethod(
          did,
          vMethodId2,
          publicKey2,
          false,
          notBefore,
          notAfter + 3600,
          vMethodId,
          0,
        ),
    ).to.emit(reg, "VerificationMethodRolled");
  });

  it("should reject bad params of rollVerificationMethod", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );

    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";

    await expect(
      reg.rollVerificationMethod(
        "did:ebsi:unknown",
        vMethodId2,
        publicKey2,
        false,
        notBefore,
        notAfter + 3600,
        vMethodId,
        0,
      ),
    ).to.be.revertedWith("did doesn't exist");

    await expect(
      reg.rollVerificationMethod(
        did,
        vMethodId,
        publicKey2,
        false,
        notBefore,
        notAfter + 3600,
        vMethodId,
        0,
      ),
    ).to.be.revertedWith("vMethodId already exists");

    await expect(
      reg.rollVerificationMethod(
        did,
        vMethodId2,
        "0x",
        false,
        notBefore,
        notAfter + 3600,
        vMethodId,
        0,
      ),
    ).to.be.revertedWith("invalid publicKey");

    await expect(
      reg.rollVerificationMethod(
        did,
        vMethodId2,
        publicKey2,
        false,
        notBefore,
        notBefore - 1,
        vMethodId,
        0,
      ),
    ).to.be.revertedWith("invalid dates");

    await expect(
      reg.rollVerificationMethod(
        did,
        vMethodId2,
        publicKey2,
        false,
        notBefore,
        notAfter + 3600,
        "",
        0,
      ),
    ).to.be.revertedWith("oldVMethodId doesn't exist");
  });

  it("should get a list of dids", async () => {
    const args: InsertDidDocumentArgs = [
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    ];

    args[0] = "did:ebsi:test1";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test2";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test3";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test4";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test5";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test6";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test7";
    await reg.insertDidDocument(...args);

    const dids = await reg.getDids(3, 2);
    expect(getEthObject(dids)).to.eql({
      items: ["did:ebsi:test5", "did:ebsi:test6"],
      total: "7",
      howMany: "2",
      prev: "2",
      next: "4",
    });

    await expect(reg.getDids(1, 51)).to.be.revertedWith(
      "pageSize must be <= 50",
    );
  });

  it("should get dids by controller", async () => {
    const args: InsertDidDocumentArgs = [
      "did:ebsi:1",
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    ];
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:2";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:3";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:4";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:5";
    await reg.insertDidDocument(...args);
    await reg.addController("did:ebsi:3", "did:ebsi:1");
    await reg.addController("did:ebsi:3", "did:ebsi:2");
    await reg.addController("did:ebsi:4", "did:ebsi:2");
    await reg.addController("did:ebsi:5", "did:ebsi:2");
    await reg.revokeController("did:ebsi:5", "did:ebsi:2");

    let dids = await reg.getDidsByController("did:ebsi:1", 1, 10);
    expect(getEthObject(dids)).to.eql({
      items: ["did:ebsi:1", "did:ebsi:3"],
      total: "2",
      howMany: "2",
      prev: "1",
      next: "1",
    });

    dids = await reg.getDidsByController("did:ebsi:2", 1, 10);
    expect(getEthObject(dids)).to.eql({
      items: ["did:ebsi:2", "did:ebsi:3", "did:ebsi:4"],
      total: "3",
      howMany: "3",
      prev: "1",
      next: "1",
    });

    dids = await reg.getDidsByController("did:ebsi:3", 1, 10);
    expect(getEthObject(dids)).to.eql({
      items: ["did:ebsi:3"],
      total: "1",
      howMany: "1",
      prev: "1",
      next: "1",
    });

    dids = await reg.getDidsByController("did:ebsi:4", 1, 10);
    expect(getEthObject(dids)).to.eql({
      items: ["did:ebsi:4"],
      total: "1",
      howMany: "1",
      prev: "1",
      next: "1",
    });

    dids = await reg.getDidsByController("did:ebsi:5", 1, 10);
    expect(getEthObject(dids)).to.eql({
      items: ["did:ebsi:5"],
      total: "1",
      howMany: "1",
      prev: "1",
      next: "1",
    });

    await expect(
      reg.getDidsByController("did:ebsi:5", 1, 51),
    ).to.be.revertedWith("pageSize must be <= 50");

    await expect(
      reg.getDidsByController("did:ebsi:unknown", 1, 10),
    ).to.be.revertedWith("controller doesn't exist");
  });

  it("should get dids by verification relationship", async () => {
    const args: InsertDidDocumentArgs = [
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    ];

    const publicKey2 = `0x${Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    ).toString("hex")}`;
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";
    const args2: InsertDidDocumentArgs = [
      did,
      baseDocument,
      vMethodId2,
      publicKey2,
      true,
      notBefore,
      notAfter,
    ];

    args[0] = "did:ebsi:test1";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test2";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test3";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test4";
    await reg.insertDidDocument(...args);

    args[0] = "did:ebsi:different-pub-key";
    await reg.insertDidDocument(...args2);

    args[0] = "did:ebsi:test5";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test6";
    await reg.insertDidDocument(...args);
    args[0] = "did:ebsi:test7";
    await reg.insertDidDocument(...args);

    const didsWithPeriod = await reg.getDidsByVerificationRelationship(
      vMethodId,
      "capabilityInvocation",
      3,
      2,
    );
    expect(getEthObject(didsWithPeriod)).to.eql({
      items: [
        {
          did: "did:ebsi:test5",
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
        },
        {
          did: "did:ebsi:test6",
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
        },
      ],
      total: "7",
      howMany: "2",
      prev: "2",
      next: "4",
    });
  });

  it("should get a did document by timestamp", async () => {
    const args: InsertDidDocumentArgs = [
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      1000,
      2000,
    ];
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";
    const publicKey2 = ethers.Wallet.createRandom().publicKey;
    await reg.insertDidDocument(...args);
    await reg.addVerificationMethod(did, vMethodId2, publicKey2, true);
    await reg.addVerificationRelationship(
      did,
      "capabilityInvocation",
      vMethodId2,
      notBefore,
      notAfter,
    );
    const now = Math.floor(Date.now() / 1000);
    let didDocument = await reg.getDidDocumentByTimestamp(did, 1500);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId],
      vMethods: [
        {
          publicKey: user.publicKey,
          isSecp256k1: true,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId,
          notBefore: "1000",
          notAfter: "2000",
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: "1000",
          notAfter: "2000",
          indexDid: "0",
        },
      ],
    });

    didDocument = await reg.getDidDocumentByTimestamp(did, now);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId2],
      vMethods: [
        {
          publicKey: publicKey2,
          isSecp256k1: true,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "capabilityInvocation",
          vMethodId: vMethodId2,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
      ],
    });
  });

  it("should check if an address is a controller", async () => {
    const vMethodId2 = "vMethodId2";
    const vMethodId3 = "vMethodId3";
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );
    await reg.insertDidDocument(
      "did:ebsi:c2",
      baseDocument,
      vMethodId2,
      user2.publicKey,
      true,
      notBefore,
      notAfter,
    );
    await reg.insertDidDocument(
      "did:ebsi:c3",
      baseDocument,
      vMethodId3,
      user3.publicKey,
      true,
      notBefore,
      notAfter,
    );
    await reg.addController(did, "did:ebsi:c2");
    /* eslint-disable @typescript-eslint/no-unused-expressions */
    expect(await reg["checkController(string,address)"](did, user.address)).to
      .be.true;
    expect(await reg["checkController(string,address)"](did, user2.address)).to
      .be.true;
    expect(await reg["checkController(string,address)"](did, user3.address)).to
      .be.false;
    expect(
      await reg["checkController(string,address)"](
        did,
        ethers.Wallet.createRandom().address,
      ),
    ).to.be.false;

    const didHex = `0x${Buffer.from(did).toString("hex")}`;
    expect(await reg["checkController(bytes,address)"](didHex, user.address)).to
      .be.true;
    expect(await reg["checkController(bytes,address)"](didHex, user2.address))
      .to.be.true;
    expect(await reg["checkController(bytes,address)"](didHex, user3.address))
      .to.be.false;
    expect(
      await reg["checkController(bytes,address)"](
        didHex,
        ethers.Wallet.createRandom().address,
      ),
    ).to.be.false;
    /* eslint-enable @typescript-eslint/no-unused-expressions */
  });

  it("should call checkController from DIDv3 when the did doesn't exist", async () => {
    const didHex = `0x${Buffer.from(did).toString("hex")}`;
    const { address } = ethers.Wallet.createRandom();
    /* eslint-disable @typescript-eslint/no-unused-expressions */
    expect(await reg["checkController(string,address)"](did, address)).to.be
      .false;
    expect(await reg["checkController(bytes,address)"](didHex, address)).to.be
      .false;

    // now, this did is inserted in DID v3
    await didV3ContractMock.setDidResult(true);
    expect(await reg["checkController(string,address)"](did, address)).to.be
      .true;
    expect(await reg["checkController(bytes,address)"](didHex, address)).to.be
      .true;
    /* eslint-enable @typescript-eslint/no-unused-expressions */
  });

  it("should follow expected usage flow", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter,
    );
    await reg.addVerificationRelationship(
      did,
      "assertionMethod",
      vMethodId,
      notBefore,
      notAfter,
    );

    const publicKey2 = Buffer.from(
      '{"kty":"OKP","crv":"Ed25519","x":"dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI"}',
    );
    const vMethodId2 = "O_EWDo1JUm3glFxTw3a9f2YfeKwbLuvG9kdGrb6gzHE";

    const publicKey3 = Buffer.from(
      '{"kty":"EC","crv":"P-256","x":"rG8XLCoehck238fGvts8Zn5_G9P5JeXTyVysKibu6qI","y":"90y-6hJf_ZKnh1nhCsc5d204xji2hhfgyPSTc6WZs6s"}',
    );
    const vMethodId3 = "HbSpfp_l-njw22UGE_DeWvNpx3BrCmyRLwZ7hMVVkSw";

    await reg.addVerificationMethod(did, vMethodId2, publicKey2, false);
    await reg.addVerificationRelationship(
      did,
      "assertionMethod",
      vMethodId2,
      notBefore,
      notAfter,
    );

    let didDocument = await reg.getDidDocument(did);
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
          name: "authentication",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "assertionMethod",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "assertionMethod",
          vMethodId: vMethodId2,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
      ],
    });

    // add a new key
    const notBefore3 = Math.floor(Date.now() / 1000);
    const notAfter3 = notBefore3 + 24 * 3600;
    await reg.addVerificationMethod(did, vMethodId3, publicKey3, false);
    await reg.addVerificationRelationship(
      did,
      "authentication",
      vMethodId3,
      notBefore3,
      notAfter3,
    );

    didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId, vMethodId2, vMethodId3],
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
        {
          publicKey: `0x${publicKey3.toString("hex")}`,
          isSecp256k1: false,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "assertionMethod",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "assertionMethod",
          vMethodId: vMethodId2,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "authentication",
          vMethodId: vMethodId3,
          notBefore: Number(notBefore3).toString(),
          notAfter: Number(notAfter3).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
      ],
    });

    // revoke key 2
    await reg.revokeVerificationMethod(did, vMethodId2, notBefore + 1);
    didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId, vMethodId3],
      vMethods: [
        {
          publicKey: user.publicKey,
          isSecp256k1: true,
          revoked: false,
        },
        {
          publicKey: `0x${publicKey3.toString("hex")}`,
          isSecp256k1: false,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "assertionMethod",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
        {
          name: "authentication",
          vMethodId: vMethodId3,
          notBefore: Number(notBefore3).toString(),
          notAfter: Number(notAfter3).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
          indexDid: "0",
        },
      ],
    });

    // roll key1
    const vMethodId4 = "qXMFeOMwDRe8ul_MiIffWYpD5ndjNhqfVDXhuDApBh4";
    const notBefore4 = notBefore + 2;
    const notAfter4 = notBefore4 + 5000;
    const publicKey4 = ethers.Wallet.createRandom().publicKey;
    await reg.rollVerificationMethod(
      did,
      vMethodId4,
      publicKey4,
      true,
      notBefore4,
      notAfter4,
      vMethodId,
      0,
    );
    didDocument = await reg.getDidDocument(did);
    expect(getEthObject(didDocument)).to.eql({
      baseDocument,
      controllers: [did],
      vMethodIds: [vMethodId3, vMethodId4],
      vMethods: [
        {
          publicKey: `0x${publicKey3.toString("hex")}`,
          isSecp256k1: false,
          revoked: false,
        },
        {
          publicKey: publicKey4,
          isSecp256k1: true,
          revoked: false,
        },
      ],
      vRelationships: [
        {
          name: "authentication",
          vMethodId: vMethodId3,
          notBefore: Number(notBefore3).toString(),
          notAfter: Number(notAfter3).toString(),
          indexDid: "0",
        },
        {
          name: "authentication",
          vMethodId: vMethodId4,
          notBefore: Number(notBefore4).toString(),
          notAfter: Number(notAfter4).toString(),
          indexDid: "0",
        },
        {
          name: "assertionMethod",
          vMethodId: vMethodId4,
          notBefore: Number(notBefore4).toString(),
          notAfter: Number(notAfter4).toString(),
          indexDid: "0",
        },
        {
          name: "capabilityInvocation",
          vMethodId: vMethodId4,
          notBefore: Number(notBefore4).toString(),
          notAfter: Number(notAfter4).toString(),
          indexDid: "0",
        },
      ],
    });
  });
});
