import { config, ethers, upgrades } from "hardhat";

import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { BytesLike, HDNodeWallet, Result } from "ethers";

import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { expect } from "chai";
import { Mnemonic } from "ethers";
import { randomBytes } from "node:crypto";

import type {
  DidRegistryMock,
  PolicyRegistryMock,
  TrackAndTrace,
  TrackAndTrace__factory,
} from "../src/types";

const DELEGATE_ACCESS = 0;
const WRITE_ACCESS = 1;
const CREATOR_ACCESS = 2;
const DID_EBSI_ACCOUNT_TYPE = 0;
const DID_KEY_ACCOUNT_TYPE = 1;

export function decodeResult(result: unknown): Record<string, unknown> {
  // Recursively fix the result object
  return fixObject((result as Result).toObject(true));
}

function fixObject(result: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(result);

  const res: Record<string, unknown> = {};
  for (const key of keys) {
    const val = result[key];
    res[key] = fixValue(val);
  }

  return res;
}

function fixValue(val: unknown): unknown {
  if (typeof val !== "object" || val === null) {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((v) => fixValue(v));
  }

  // Replace empty objects with empty arrays
  if (Object.keys(val).length === 0) {
    return [];
  }

  // When ethers.js returns an object with only one key "_", it should be converted into a single-item array
  if (Object.keys(val).length === 1 && "_" in val) {
    return [fixValue(val._)];
  }

  return fixObject(val as Record<string, unknown>);
}

describe("TrackAndTrace - tests", () => {
  let admin: SignerWithAddress;
  let upgrader: SignerWithAddress;
  let broadcaster: SignerWithAddress;
  let broadcaster2: SignerWithAddress;
  const supportOfficeAccount = "didSupportOffice";
  const creatorAccount = "didEbsi";
  const writerAccount = "didWriter";
  const delegateAccount = "didDelegate";
  let randomWallet: HDNodeWallet;
  let randomWalletWithSigner: HDNodeWallet;
  let trackAndTrace: TrackAndTrace;
  let didRegistryMock: DidRegistryMock;
  let tprMock: PolicyRegistryMock;
  let trackAndTraceFactory: TrackAndTrace__factory;

  async function createDocument(documentHash: BytesLike) {
    const metadata = "metadata";
    await trackAndTrace
      .connect(broadcaster)
      [
        "createDocument(bytes32,string,string)"
      ](documentHash, metadata, creatorAccount);
  }

  async function grantAccess(
    documentHash: BytesLike,
    creatorAcc: BytesLike,
    subjectAcc: BytesLike,
    permission: number,
  ) {
    await trackAndTrace
      .connect(broadcaster)
      .grantAccess(
        documentHash,
        creatorAcc,
        subjectAcc,
        DID_EBSI_ACCOUNT_TYPE,
        DID_EBSI_ACCOUNT_TYPE,
        permission,
      );
  }

  before(async () => {
    [admin, upgrader, broadcaster, broadcaster2] = await ethers.getSigners();
    randomWallet = ethers.Wallet.createRandom();
    randomWalletWithSigner = randomWallet.connect(ethers.provider);

    const trackAndTraceLibFactory = await ethers.getContractFactory(
      "TrackAndTraceLib",
      {},
    );
    const trackAndTraceLibContract = await (
      await trackAndTraceLibFactory.deploy()
    ).waitForDeployment();

    trackAndTraceFactory = await ethers.getContractFactory("TrackAndTrace", {
      libraries: {
        TrackAndTraceLib: await trackAndTraceLibContract.getAddress(),
      },
    });

    // deploy TPR mock
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    tprMock = await (await policyRegistryFactory.deploy()).waitForDeployment();

    // deploy DID mock
    const didMockFactory = await ethers.getContractFactory("DidRegistryMock");
    didRegistryMock = await (await didMockFactory.deploy()).waitForDeployment();
    // trackAndTrace = await trackAndTraceFactory.deploy();
    console.log(`deploying track and trace proxy`);
    trackAndTrace = await upgrades.deployProxy(
      trackAndTraceFactory,
      [
        admin.address,
        await upgrader.getAddress(),
        await tprMock.getAddress(),
        await didRegistryMock.getAddress(),
      ],
      { unsafeAllowLinkedLibraries: true },
    );
    await didRegistryMock.setDidResult(true);
    await tprMock.setPolicyResult(true);

    await trackAndTrace
      .connect(broadcaster)
      .authoriseDid(supportOfficeAccount, creatorAccount, true);
  });

  describe("Basic", () => {
    it("should test initialize", async () => {
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            ethers.ZeroAddress,
            await upgrader.getAddress(),
            await tprMock.getAddress(),
            await didRegistryMock.getAddress(),
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            await upgrader.getAddress(),
            ethers.ZeroAddress,
            await tprMock.getAddress(),
            await didRegistryMock.getAddress(),
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            await upgrader.getAddress(),
            await tprMock.getAddress(),
            ethers.ZeroAddress,
            await didRegistryMock.getAddress(),
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            await upgrader.getAddress(),
            await tprMock.getAddress(),
            await didRegistryMock.getAddress(),
            ethers.ZeroAddress,
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
    });

    it("should be already initialized", async () => {
      await expect(
        trackAndTrace.initialize(
          await admin.getAddress(),
          await upgrader.getAddress(),
          await tprMock.getAddress(),
          await didRegistryMock.getAddress(),
        ),
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });

    it("should reinitialize", async () => {
      await expect(
        trackAndTrace.initializeV2(await tprMock.getAddress()),
      ).to.be.revertedWith(
        "AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
      );
      await expect(
        trackAndTrace
          .connect(upgrader)
          .initializeV2(await tprMock.getAddress()),
      ).to.emit(trackAndTrace, "ContractReinitialized");
    });

    it("should be reverted if the wallet is not controller of did ebsi", async () => {
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .authoriseDid("didebsi", creatorAccount, true),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
    });

    it("should revert if user not upgrader", async () => {
      const trackAndTraceLibFactory = await ethers.getContractFactory(
        "TrackAndTraceLib",
        {},
      );
      const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

      trackAndTraceFactory = await ethers.getContractFactory("TrackAndTrace", {
        libraries: {
          TrackAndTraceLib: await trackAndTraceLibContract.getAddress(),
        },
      });
      const newTrackAndTraceImplementation =
        await trackAndTraceFactory.deploy();

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .upgradeTo(await newTrackAndTraceImplementation.getAddress()),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotUpgrader");
    });

    it("should revert if the external timestamp is zero", async () => {
      await didRegistryMock.setDidResult(true);
      const documentHash = ethers.encodeBytes32String("e68905e6");
      const proof = ethers.encodeBytes32String("ab4567");
      const metadata = "metadata";
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string,uint256,bytes32)"
          ](documentHash, metadata, creatorAccount, 0, proof),
      ).to.revertedWithCustomError(trackAndTrace, "InvalidTimestamp");
    });

    it("should restrict authorizeDid function to only users with TPR attributes", async () => {
      await tprMock.setPolicyResult(false);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .authoriseDid(supportOfficeAccount, creatorAccount, true),
      ).to.revertedWithCustomError(trackAndTrace, "NotAuthorised");
    });

    it("should create document", async () => {
      const documentHash = ethers.encodeBytes32String("e68905e6");
      const metadata = "metadata";
      await didRegistryMock.setDidResult(true);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string,uint256,bytes32)"
          ](documentHash, metadata, "notinvited", 1000, ethers.keccak256(ethers.toUtf8Bytes("proof"))),
      ).to.be.revertedWithCustomError(trackAndTrace, "DidNotInvited");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string)"
          ](documentHash, metadata, "notinvited"),
      ).to.be.revertedWithCustomError(trackAndTrace, "DidNotInvited");
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string,uint256,bytes32)"
          ](documentHash, metadata, "notinvited", 1000, ethers.keccak256(ethers.toUtf8Bytes("proof"))),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string)"
          ](documentHash, metadata, creatorAccount),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string)"
          ](documentHash, metadata, creatorAccount),
      ).to.emit(trackAndTrace, "DocumentCreated");
    });

    it("should remove document", async () => {
      const documentHash = ethers.encodeBytes32String("remove01");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace.connect(broadcaster).removeDocument(documentHash),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await expect(
        trackAndTrace.connect(broadcaster).removeDocument(documentHash),
      ).to.emit(trackAndTrace, "DocumentRemoved");
    });

    it("should get the implementation", async () => {
      const implInContract = await trackAndTrace.getImplementation();
      const implAddress = await getImplementationAddress(
        ethers.provider,
        await trackAndTrace.getAddress(),
      );
      expect(implInContract).to.be.equal(implAddress);
    });

    it("should grant delegate access to a did ebsi", async () => {
      const documentHash = ethers.encodeBytes32String("delegate01");
      await createDocument(documentHash);
      await didRegistryMock.setDidResult(true);
      const subjectAccount = ethers.toUtf8Bytes(delegateAccount);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .grantAccess(
            documentHash,
            ethers.toUtf8Bytes(creatorAccount),
            subjectAccount,
            DID_EBSI_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            DELEGATE_ACCESS,
          ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(
          documentHash,
          ethers.hexlify(subjectAccount),
          ethers.hexlify(ethers.toUtf8Bytes(creatorAccount)),
          0,
        );
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .grantAccess(
            documentHash,
            ethers.toUtf8Bytes(creatorAccount),
            subjectAccount,
            DID_EBSI_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            DELEGATE_ACCESS,
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "PermissionExists");
    });

    it("should check if did is creator", async () => {
      expect(
        await trackAndTrace.isCreator(ethers.toUtf8Bytes(creatorAccount)),
      ).to.be.equal(true);
    });

    it("should grant delegate access to a did key", async () => {
      const documentHash = ethers.encodeBytes32String("delegate02");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.toUtf8Bytes(delegateAccount);

      await expect(createDocument(documentHash)).to.be.revertedWithCustomError(
        trackAndTrace,
        "DocumentExists",
      );

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .grantAccess(
            documentHash,
            creatorAcc,
            subjectAccount,
            DID_EBSI_ACCOUNT_TYPE,
            DID_KEY_ACCOUNT_TYPE,
            DELEGATE_ACCESS,
          ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(
          documentHash,
          ethers.hexlify(subjectAccount),
          ethers.hexlify(creatorAcc),
          0,
        );
    });

    it("should give write access with did key", async () => {
      const documentHash = ethers.encodeBytes32String("delegate03");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const subjectKeyAccount = randomWallet.signingKey.publicKey;

      await trackAndTrace
        .connect(broadcaster)
        .grantAccess(
          documentHash,
          creatorAcc,
          subjectKeyAccount,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          DELEGATE_ACCESS,
        );

      await expect(
        trackAndTrace
          .connect(randomWalletWithSigner)
          .grantAccess(
            documentHash,
            subjectKeyAccount,
            subjectKeyAccount,
            DID_KEY_ACCOUNT_TYPE,
            DID_KEY_ACCOUNT_TYPE,
            WRITE_ACCESS,
            {
              gasPrice: 0,
            },
          ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(documentHash, subjectKeyAccount, subjectKeyAccount, 1);
    });

    it("should grant write access with delegate account", async () => {
      const documentHash = ethers.encodeBytes32String("write01");
      await didRegistryMock.setDidResult(true);
      await tprMock.setPolicyResult(true);
      await createDocument(documentHash);
      await trackAndTrace.authoriseDid(
        supportOfficeAccount,
        writerAccount,
        true,
      );
      await grantAccess(
        documentHash,
        ethers.toUtf8Bytes(creatorAccount),
        ethers.toUtf8Bytes(delegateAccount),
        DELEGATE_ACCESS,
      );
      const creatorAcc = ethers.toUtf8Bytes(delegateAccount);
      const subjectAcc = ethers.toUtf8Bytes(writerAccount);

      await expect(
        await trackAndTrace.grantAccess(
          documentHash,
          creatorAcc,
          subjectAcc,
          DID_EBSI_ACCOUNT_TYPE,
          DID_EBSI_ACCOUNT_TYPE,
          WRITE_ACCESS,
        ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(documentHash, subjectAcc, creatorAcc, 1);
    });

    it("should unauthorized accounts to revoke", async () => {
      const documentHash = `0x${randomBytes(32).toString("hex")}`;
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.toUtf8Bytes(delegateAccount);
      await grantAccess(
        documentHash,
        creatorAcc,
        subjectAccount,
        DELEGATE_ACCESS,
      );

      const unauthorizedUser = `0x${randomBytes(5).toString("hex")}`;

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(
            documentHash,
            unauthorizedUser,
            subjectAccount,
            DELEGATE_ACCESS,
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyAccessGranter");
    });

    it("should revoke delegate account", async () => {
      const documentHash = ethers.encodeBytes32String("delegate04");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.toUtf8Bytes(delegateAccount);
      await grantAccess(
        documentHash,
        creatorAcc,
        subjectAccount,
        DELEGATE_ACCESS,
      );

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(
            documentHash,
            creatorAcc,
            subjectAccount,
            DELEGATE_ACCESS,
          ),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(
          documentHash,
          ethers.hexlify(subjectAccount),
          ethers.hexlify(creatorAcc),
        );
    });

    it("should revoke write account", async () => {
      const documentHash = ethers.encodeBytes32String("write02");
      await createDocument(documentHash);
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.toUtf8Bytes(writerAccount);
      await grantAccess(documentHash, creatorAcc, subjectAccount, WRITE_ACCESS);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(documentHash, creatorAcc, subjectAccount, WRITE_ACCESS),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(
          documentHash,
          ethers.hexlify(subjectAccount),
          ethers.hexlify(creatorAcc),
        );
    });

    it("should write event", async () => {
      const documentHash = ethers.encodeBytes32String("writeEvent01");
      const externalHash = "externalHash";
      const sender = ethers.toUtf8Bytes(creatorAccount);
      const sender2 = ethers.toUtf8Bytes("randomAccount");
      const origin = "origin";
      const metadata = "metadata";
      await createDocument(documentHash);
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)"](
            {
              documentHash,
              externalHash,
              metadata,
              origin,
              sender,
            },
            1,
            ethers.keccak256(ethers.toUtf8Bytes("proof")),
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)"](
            {
              documentHash,
              externalHash,
              metadata,
              origin,
              sender: sender2,
            },
            1,
            ethers.keccak256(ethers.toUtf8Bytes("proof")),
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyCreatorOrWriter");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            metadata,
            origin,
            sender,
          }),
      ).to.emit(trackAndTrace, "EventWritten");

      const event = await trackAndTrace.getFunction("getEvent")(
        documentHash,
        ethers.keccak256(ethers.toUtf8Bytes(externalHash)),
      );

      expect(event.externalHash).to.be.equal(externalHash);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            metadata,
            origin,
            sender,
          }),
      ).to.be.revertedWithCustomError(trackAndTrace, "ExternalHashExist");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)"](
            {
              documentHash,
              externalHash: "externalHash2",
              metadata,
              origin,
              sender,
            },
            1000,
            ethers.keccak256(ethers.toUtf8Bytes("proof")),
          ),
      ).to.emit(trackAndTrace, "EventWritten");
      /// test for invalid timestamp
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)"](
            {
              documentHash,
              externalHash: "externalHash3",
              metadata,
              origin,
              sender,
            },
            0,
            ethers.keccak256(ethers.toUtf8Bytes("proof")),
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidTimestamp");

      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster2)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash: "randomHHHash",
            metadata,
            origin,
            sender: sender2,
          }),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await expect(
        trackAndTrace
          .connect(broadcaster2)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash: "randomHHHash3",
            metadata,
            origin,
            sender: sender2,
          }),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyCreatorOrWriter");
    });

    it("should getAccount Access", async () => {
      const documentHash = ethers.encodeBytes32String("getAccess01");
      await createDocument(documentHash);
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.toUtf8Bytes(delegateAccount);
      await grantAccess(
        documentHash,
        creatorAcc,
        subjectAccount,
        DELEGATE_ACCESS,
      );
      expect(
        await trackAndTrace.getAccountAccess(documentHash, creatorAcc, 0),
      ).to.be.equal(false);
    });

    it("should not be able to write an event checks", async () => {
      const documentHash = ethers.encodeBytes32String("long metadata");
      const externalHash = "externalHash long";
      const sender = ethers.toUtf8Bytes(creatorAccount);
      const origin = "origin";
      const metadata = "metadata";
      const longMetadata = metadata.repeat(5000);
      await createDocument(documentHash);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string)"
          ](ethers.encodeBytes32String("random hash hash"), longMetadata, creatorAccount, { gasLimit: 20_000_000 }),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidMetadata");
      const WriteEvent = {
        documentHash,
        externalHash,
        metadata: longMetadata,
        origin,
        sender,
      };
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "writeEvent((bytes32,string,bytes,string,string))"
          ](WriteEvent, { gasLimit: 20_000_000 }),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidMetadata");
    });

    it("should write event using a did:key", async () => {
      const documentHash = ethers.encodeBytes32String("writeEvent02");
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const externalHash = "externalHash";

      const { mnemonic } = config.networks.hardhat.accounts as {
        mnemonic: string;
      };
      const walletDidKey = ethers.HDNodeWallet.fromMnemonic(
        Mnemonic.fromPhrase(mnemonic),
      ).connect(ethers.provider);

      const pubDidKey = walletDidKey.signingKey.publicKey;
      const origin = "origin";
      const metadata = "metadata";
      await createDocument(documentHash);
      await trackAndTrace.grantAccess(
        documentHash,
        creatorAcc,
        pubDidKey,
        DID_EBSI_ACCOUNT_TYPE,
        DID_KEY_ACCOUNT_TYPE,
        WRITE_ACCESS,
      );
      await expect(
        trackAndTrace
          .connect(walletDidKey)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            metadata,
            origin,
            sender: pubDidKey,
          }),
      ).to.emit(trackAndTrace, "EventWritten");
    });

    it("should write event using a did:key not sliced", async () => {
      const documentHash = ethers.encodeBytes32String("writeEvent02-notsliced");
      const creatorAcc = ethers.toUtf8Bytes(creatorAccount);
      const externalHash = "externalHash";

      const { mnemonic } = config.networks.hardhat.accounts as {
        mnemonic: string;
      };
      const walletDidKey = ethers.HDNodeWallet.fromMnemonic(
        Mnemonic.fromPhrase(mnemonic),
      ).connect(ethers.provider);

      const pubDidKey = walletDidKey.signingKey.publicKey;
      const origin = "origin";
      const metadata = "metadata";
      await createDocument(documentHash);
      await trackAndTrace.grantAccess(
        documentHash,
        creatorAcc,
        pubDidKey,
        DID_EBSI_ACCOUNT_TYPE,
        DID_KEY_ACCOUNT_TYPE,
        WRITE_ACCESS,
      );
      await expect(
        trackAndTrace
          .connect(walletDidKey)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            metadata,
            origin,
            sender: pubDidKey,
          }),
      ).to.emit(trackAndTrace, "EventWritten");
    });

    it("should grant, revoke and get accesses", async () => {
      const documentHash = ethers.encodeBytes32String("document1");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = `0x${Buffer.from(creatorAccount).toString("hex")}`;
      const subjectKeyAccount = ethers.Wallet.createRandom().publicKey;

      // grant delegate access
      await trackAndTrace
        .connect(broadcaster)
        .grantAccess(
          documentHash,
          creatorAcc,
          subjectKeyAccount,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          DELEGATE_ACCESS,
        );

      // grant write access
      await trackAndTrace
        .connect(broadcaster)
        .grantAccess(
          documentHash,
          creatorAcc,
          subjectKeyAccount,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          WRITE_ACCESS,
        );

      let accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        subjectKeyAccount,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      await expect(
        trackAndTrace.getGrantedBy(documentHash, subjectKeyAccount, []),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidArrayLength");
      expect(accesses).to.deep.equal([
        // granted by
        [creatorAcc, creatorAcc, "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [true, true, false],
      ]);

      // revoke delegate access
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(
            documentHash,
            creatorAcc,
            subjectKeyAccount,
            DELEGATE_ACCESS,
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await trackAndTrace
        .connect(broadcaster)
        .revokeAccess(
          documentHash,
          creatorAcc,
          subjectKeyAccount,
          DELEGATE_ACCESS,
        );
      accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        subjectKeyAccount,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      expect(accesses).to.deep.equal([
        // granted by
        ["0x", creatorAcc, "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [false, true, false],
      ]);

      // revoke write access
      await trackAndTrace
        .connect(broadcaster)
        .revokeAccess(
          documentHash,
          creatorAcc,
          subjectKeyAccount,
          WRITE_ACCESS,
        );
      accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        subjectKeyAccount,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      expect(accesses).to.deep.equal([
        // granted by
        ["0x", "0x", "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [false, false, false],
      ]);
    });

    it("test migrationRemoveDocument", async () => {
      const documentHash = ethers.encodeBytes32String("documentRemove");
      const documentHash2 = ethers.encodeBytes32String("documentRemove2");

      await createDocument(documentHash);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .migrationRemoveDocument(documentHash),
      ).to.be.revertedWithCustomError(trackAndTrace, "DocumentExists");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .migrationRemoveDocument(documentHash2),
      )
        .to.emit(trackAndTrace, "DocumentRemoved")
        .withArgs(documentHash2);
    });

    it("should grant and revoke accesses to the creator", async () => {
      await didRegistryMock.setDidResult(true);
      const creator = "did:ebsi:creator1";
      const creator2 = "did:ebsi:creator2";
      const creatorBuffer = `0x${Buffer.from(creator).toString("hex")}`;
      const creatorBuffer2 = `0x${Buffer.from(creator2).toString("hex")}`;
      const documentHash = ethers.encodeBytes32String("document2");
      await trackAndTrace.authoriseDid(supportOfficeAccount, creator, true);
      await trackAndTrace["createDocument(bytes32,string,string)"](
        documentHash,
        "metadata",
        creator,
      );

      // grant delegate access to himself
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace.grantAccess(
          documentHash,
          creatorBuffer2,
          creatorBuffer2,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          DELEGATE_ACCESS,
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await expect(
        trackAndTrace.grantAccess(
          documentHash,
          creatorBuffer2,
          creatorBuffer2,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          DELEGATE_ACCESS,
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyCreator");
      await expect(
        trackAndTrace.grantAccess(
          documentHash,
          creatorBuffer2,
          creatorBuffer2,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          WRITE_ACCESS,
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyCreatorOrDelegated");

      await trackAndTrace.grantAccess(
        documentHash,
        creatorBuffer,
        creatorBuffer,
        DID_EBSI_ACCOUNT_TYPE,
        DID_KEY_ACCOUNT_TYPE,
        DELEGATE_ACCESS,
      );

      // grant write access to himself
      await trackAndTrace
        .connect(broadcaster)
        .grantAccess(
          documentHash,
          creatorBuffer,
          creatorBuffer,
          DID_EBSI_ACCOUNT_TYPE,
          DID_KEY_ACCOUNT_TYPE,
          WRITE_ACCESS,
        );

      let accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        creatorBuffer,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      expect(accesses).to.deep.equal([
        // granted by
        [creatorBuffer, creatorBuffer, creatorBuffer],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [true, true, true],
      ]);

      // revoke delegate access
      await trackAndTrace
        .connect(broadcaster)
        .revokeAccess(
          documentHash,
          creatorBuffer,
          creatorBuffer,
          DELEGATE_ACCESS,
        );
      accesses = await trackAndTrace.getGrantedBy(documentHash, creatorBuffer, [
        DELEGATE_ACCESS,
        WRITE_ACCESS,
        CREATOR_ACCESS,
      ]);
      expect(accesses).to.deep.equal([
        // granted by
        ["0x", creatorBuffer, creatorBuffer],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [false, true, true],
      ]);

      // revoke write access
      await trackAndTrace
        .connect(broadcaster)
        .revokeAccess(documentHash, creatorBuffer, creatorBuffer, WRITE_ACCESS);
      accesses = await trackAndTrace.getGrantedBy(documentHash, creatorBuffer, [
        DELEGATE_ACCESS,
        WRITE_ACCESS,
        CREATOR_ACCESS,
      ]);
      expect(accesses).to.deep.equal([
        // granted by
        ["0x", "0x", creatorBuffer],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [false, false, true],
      ]);
    });
  });

  describe("revocation in cascade", () => {
    const noAccess = [
      // granted by
      ["0x", "0x", "0x"],
      // granted by type
      [0, 0, 0],
      // access: [delegate, write, creator]
      [false, false, false],
    ];

    it("should reject too many children", async () => {
      const documentHash = randomBytes(32);
      const creatorAcc = `0x${Buffer.from(creatorAccount).toString("hex")}`;
      const delegatee = `0x${randomBytes(5).toString("hex")}`;
      const accounts: string[] = [];
      for (let i = 0; i < 10; i += 1)
        accounts.push(`0x${randomBytes(5).toString("hex")}`);
      await didRegistryMock.setDidResult(true);

      // create document
      await createDocument(documentHash);

      // grant delegate access to delegatee account
      await trackAndTrace.grantAccess(
        documentHash,
        creatorAcc,
        delegatee,
        DID_EBSI_ACCOUNT_TYPE,
        DID_EBSI_ACCOUNT_TYPE,
        DELEGATE_ACCESS,
      );

      // delegatee account grants write access to multiple accounts
      await Promise.all(
        accounts.map((account) =>
          trackAndTrace.grantAccess(
            documentHash,
            delegatee,
            account,
            DID_EBSI_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            WRITE_ACCESS,
          ),
        ),
      );

      await expect(
        trackAndTrace.grantAccess(
          documentHash,
          delegatee,
          `0x${randomBytes(5).toString("hex")}`,
          DID_EBSI_ACCOUNT_TYPE,
          DID_EBSI_ACCOUNT_TYPE,
          WRITE_ACCESS,
        ),
      ).to.be.revertedWithCustomError(
        trackAndTrace,
        "TooManyDelegatedChildren",
      );
    });

    it("should revoke in cascade (did:ebsi)", async () => {
      const documentHash = randomBytes(32);
      const creatorAcc = `0x${Buffer.from(creatorAccount).toString("hex")}`;
      const delegatee = `0x${randomBytes(5).toString("hex")}`;
      const accounts: string[] = [];
      for (let i = 0; i < 10; i += 1)
        accounts.push(`0x${randomBytes(5).toString("hex")}`);
      await didRegistryMock.setDidResult(true);

      // create document
      await createDocument(documentHash);

      // grant delegate access to delegatee account
      await trackAndTrace.grantAccess(
        documentHash,
        creatorAcc,
        delegatee,
        DID_EBSI_ACCOUNT_TYPE,
        DID_EBSI_ACCOUNT_TYPE,
        DELEGATE_ACCESS,
      );

      // delegatee account grants write access to multiple accounts
      await Promise.all(
        accounts.map((account) =>
          trackAndTrace.grantAccess(
            documentHash,
            delegatee,
            account,
            DID_EBSI_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            WRITE_ACCESS,
          ),
        ),
      );

      // verify the grants
      let accesses = await trackAndTrace.getGrantedBy(documentHash, delegatee, [
        DELEGATE_ACCESS,
        WRITE_ACCESS,
        CREATOR_ACCESS,
      ]);
      expect(accesses).to.deep.equal([
        // granted by
        [creatorAcc, "0x", "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, 0, 0],
        // access: [delegate, write, creator]
        [true, false, false],
      ]);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(accesses).to.deep.equal([
            // granted by
            ["0x", delegatee, "0x"],
            // granted by type
            [0, DID_EBSI_ACCOUNT_TYPE, 0],
            // access: [delegate, write, creator]
            [false, true, false],
          ]);
        }),
      );

      // the creator revokes delegatee account
      await trackAndTrace.revokeAccess(
        documentHash,
        creatorAcc,
        delegatee,
        DELEGATE_ACCESS,
      );

      // the revocation must cascade. So it should be applied to
      // delegatee account and its children
      accesses = await trackAndTrace.getGrantedBy(documentHash, delegatee, [
        DELEGATE_ACCESS,
        WRITE_ACCESS,
        CREATOR_ACCESS,
      ]);
      expect(accesses).to.deep.equal(noAccess);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(accesses).to.deep.equal(noAccess);
        }),
      );
    });

    it("should revoke in cascade (did:key)", async () => {
      const documentHash = randomBytes(32);
      const creatorAcc = `0x${Buffer.from(creatorAccount).toString("hex")}`;
      const { mnemonic } = config.networks.hardhat.accounts as {
        mnemonic: string;
      };
      const keyWallet = ethers.HDNodeWallet.fromMnemonic(
        Mnemonic.fromPhrase(mnemonic),
      ).connect(ethers.provider);
      const delegatee = keyWallet.signingKey.publicKey;
      const accounts: string[] = [];
      for (let i = 0; i < 10; i += 1)
        accounts.push(`0x${randomBytes(5).toString("hex")}`);
      await didRegistryMock.setDidResult(true);

      // create document
      await createDocument(documentHash);

      // grant delegate access to account Key
      await trackAndTrace.grantAccess(
        documentHash,
        creatorAcc,
        delegatee,
        DID_EBSI_ACCOUNT_TYPE,
        DID_KEY_ACCOUNT_TYPE,
        DELEGATE_ACCESS,
      );

      // account Key grants write access to multiple accounts

      // await loop is required, otherwise we get "Error: nonce has already been used"
      for (const account of accounts) {
        await trackAndTrace
          .connect(keyWallet)
          .grantAccess(
            documentHash,
            delegatee,
            account,
            DID_KEY_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            WRITE_ACCESS,
          );
      }

      // verify the grants
      let accesses = await trackAndTrace.getGrantedBy(documentHash, delegatee, [
        DELEGATE_ACCESS,
        WRITE_ACCESS,
        CREATOR_ACCESS,
      ]);
      expect(accesses).to.deep.equal([
        // granted by
        [creatorAcc, "0x", "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, 0, 0],
        // access: [delegate, write, creator]
        [true, false, false],
      ]);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(accesses).to.deep.equal([
            // granted by
            ["0x", delegatee, "0x"],
            // granted by type
            [0, DID_KEY_ACCOUNT_TYPE, 0],
            // access: [delegate, write, creator]
            [false, true, false],
          ]);
        }),
      );

      // the creator revokes account Key
      await trackAndTrace.revokeAccess(
        documentHash,
        creatorAcc,
        delegatee,
        DELEGATE_ACCESS,
      );

      // the revocation must cascade. So it should be applied to
      // account Key and its children
      accesses = await trackAndTrace.getGrantedBy(documentHash, delegatee, [
        DELEGATE_ACCESS,
        WRITE_ACCESS,
        CREATOR_ACCESS,
      ]);
      expect(accesses).to.deep.equal(noAccess);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(accesses).to.deep.equal(noAccess);
        }),
      );
    });
  });
});
