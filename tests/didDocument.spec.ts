import { ethers, network, config } from "hardhat";
import { expect } from "chai";
import { DidRegistry } from "../src/types";
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

describe("Did Documents", () => {
  let reg: DidRegistry;

  const acc = config.networks.hardhat.accounts as { mnemonic: string };
  const hd = ethers.utils.HDNode.fromMnemonic(acc.mnemonic);

  let user = new ethers.Wallet(hd.derivePath("m/44'/60'/0'/0/1").privateKey);
  const did = "did:ebsi:zpUnevx4dP2R2BvbjFEnnFF";
  const baseDocument =
    '{"@context":["https://www.w3.org/ns/did/v1","https://w3id.org/security/suites/jws-2020/v1"]}';
  const vMethodId = "H5RhB6vyFgl2Uizk8IjL_9AkB5mfqgn5ApgfHUbkqdQ";
  const notBefore = 1000;
  const notAfter = 2000;

  before(async () => {
    const [admin] = await ethers.getSigners();
    if (!admin.provider) throw new Error("provider not defined");
    user = user.connect(admin.provider);

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

  it("should get a did document", async () => {
    await reg.insertDidDocument(
      did,
      baseDocument,
      vMethodId,
      user.publicKey,
      true,
      notBefore,
      notAfter
    );
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
          name: "capabilityInvocation",
          vMethodId,
          notBefore: Number(notBefore).toString(),
          notAfter: Number(notAfter).toString(),
        },
      ],
    });
  });
});
