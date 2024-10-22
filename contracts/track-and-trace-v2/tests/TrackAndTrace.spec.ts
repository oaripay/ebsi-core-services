import { ethers, upgrades, config } from "hardhat";
import { BytesLike, Wallet } from "ethers";
import { randomBytes } from "crypto";
import { Signer } from "@nomiclabs/hardhat-ethers/signers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { expect } from "chai";
import { DidRegistryMock, PolicyRegistryMock } from "../dist";

const DELEGATE_ACCESS = 0;
const WRITE_ACCESS = 1;
const CREATOR_ACCESS = 2;
const DID_EBSI_ACCOUNT_TYPE = 0;
const DID_KEY_ACCOUNT_TYPE = 1;

function getEthObject(o: unknown): Record<string, unknown> | unknown[] {
  const obj = o as string[] & Record<string, unknown>;
  const keys = Object.keys(obj);

  // check if it is a string
  if (typeof obj === "string") return obj;

  // check if it is an array
  if (keys[keys.length - 1] === String(keys.length - 1)) {
    return (o as unknown[]).map((item) => getEthObject(item));
  }

  // check if it is a buffer
  if (keys[0] !== "0") return obj;

  // treat it as object. ["alice", "name": "alice"] ==> { "name" : "alice" }
  const result: Record<string, unknown> = {};
  keys.forEach((k, i) => {
    if (i < keys.length / 2) return;

    if (typeof obj[k] === "object") {
      result[k] = getEthObject(obj[k]);
    } else {
      result[k] = obj[k];
    }
  });
  return result;
}

describe("TrackAndTrace - tests", () => {
  let admin: Signer;
  let upgrader: Signer;
  let broadcaster: Signer;
  let broadcaster2: Signer;
  const supportOfficeAccount = "didSupportOffice";
  const creatorAccount = "didEbsi";
  const writerAccount = "didWriter";
  const delegateAccount = "didDelegate";
  let randomWallet: Wallet;
  let randomWalletWithSigner: Signer;
  let trackAndTrace;
  let didRegistryMock: DidRegistryMock;
  let tprMock: PolicyRegistryMock;
  let trackAndTraceFactory;

  async function createDocument(
    documentHash: ethers.utils.formatBytes32String,
  ) {
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
    ).deployed();

    trackAndTraceFactory = await ethers.getContractFactory("TrackAndTrace", {
      libraries: { TrackAndTraceLib: trackAndTraceLibContract.address },
    });

    // deploy TPR mock
    const policyRegistryFactory =
      await ethers.getContractFactory("PolicyRegistryMock");
    tprMock = (await (
      await policyRegistryFactory.deploy()
    ).deployed()) as unknown as PolicyRegistryMock;

    // deploy DID mock
    const didMockFactory = await ethers.getContractFactory("DidRegistryMock");
    didRegistryMock = (await (
      await didMockFactory.deploy()
    ).deployed()) as unknown as DidRegistryMock;
    // trackAndTrace = await trackAndTraceFactory.deploy();
    console.log(`deploying track and trace proxy`);
    trackAndTrace = await upgrades.deployProxy(
      trackAndTraceFactory,
      [
        await admin.address,
        await upgrader.getAddress(),
        await tprMock.address,
        await didRegistryMock.address,
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
            ethers.constants.AddressZero,
            await upgrader.getAddress(),
            await tprMock.address,
            await didRegistryMock.address,
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            await upgrader.getAddress(),
            ethers.constants.AddressZero,
            await tprMock.address,
            await didRegistryMock.address,
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            await upgrader.getAddress(),
            await tprMock.address,
            ethers.constants.AddressZero,
            await didRegistryMock.address,
          ],
          { unsafeAllowLinkedLibraries: true },
        ),
      ).to.be.revertedWithCustomError(trackAndTrace, "ZeroAddress");
      await expect(
        upgrades.deployProxy(
          trackAndTraceFactory,
          [
            await upgrader.getAddress(),
            await tprMock.address,
            await didRegistryMock.address,
            ethers.constants.AddressZero,
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
          await tprMock.address,
          await didRegistryMock.address,
        ),
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
    it("should reinitialize", async () => {
      await expect(
        trackAndTrace.initializeV2(await tprMock.address),
      ).to.be.revertedWith(
        "AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
      );
      await expect(
        trackAndTrace.connect(upgrader).initializeV2(await tprMock.address),
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
        libraries: { TrackAndTraceLib: trackAndTraceLibContract.address },
      });
      const newTrackAndTraceImplementation =
        await trackAndTraceFactory.deploy();

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .upgradeTo(newTrackAndTraceImplementation.address),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotUpgrader");
    });
    it("should revert if the external timestamp is zero", async () => {
      await didRegistryMock.setDidResult(true);
      const documentHash = ethers.utils.formatBytes32String("e68905e6");
      const proof = ethers.utils.formatBytes32String("ab4567");
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
      const documentHash = ethers.utils.formatBytes32String("e68905e6");
      const metadata = "metadata";
      await didRegistryMock.setDidResult(true);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string,uint256,bytes32)"
          ](documentHash, metadata, "notinvited", 1000, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("proof"))),
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
          ](documentHash, metadata, "notinvited", 1000, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("proof"))),
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
      const documentHash = ethers.utils.formatBytes32String("remove01");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace.connect(broadcaster).removeDocument(documentHash),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await trackAndTrace.connect(broadcaster).removeDocument(documentHash);
      const [, , creator] = await trackAndTrace
        .connect(broadcaster)
        .documents(documentHash);

      expect(creator).to.eq("");
    });

    it("should get the implementation", async () => {
      const implInContract = await trackAndTrace.getImplementation();
      const implAddress = await getImplementationAddress(
        ethers.provider,
        trackAndTrace.address,
      );
      expect(implInContract).to.be.equal(implAddress);
    });

    it("should get the documents paginated and get the document", async () => {
      await didRegistryMock.setDidResult(true);
      for (let i = 0; i < 10; ) {
        i += 1;
        // eslint-disable-next-line no-await-in-loop
        await createDocument(ethers.utils.formatBytes32String(`randomDoc${i}`));
      }
      const docs = await trackAndTrace.getDocuments(1, 1);
      expect(docs).to.be.deep.equal([
        [ethers.utils.formatBytes32String("e68905e6")],
        BigInt(11),
        BigInt(1),
        BigInt(1),
        BigInt(2),
      ]);
      const docHash = ethers.utils.formatBytes32String("e68905e6");
      const doc = await trackAndTrace.getDocument(docHash);
      expect(doc.creator).to.be.equal("didEbsi");
    });

    it("should grant delegate access to a did ebsi", async () => {
      const documentHash = ethers.utils.formatBytes32String("delegate01");
      await createDocument(documentHash);
      await didRegistryMock.setDidResult(true);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .grantAccess(
            documentHash,
            ethers.utils.toUtf8Bytes(creatorAccount),
            subjectAccount,
            DID_EBSI_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            DELEGATE_ACCESS,
          ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(
          documentHash,
          ethers.utils.hexlify(subjectAccount),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(creatorAccount)),
          0,
        );
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .grantAccess(
            documentHash,
            ethers.utils.toUtf8Bytes(creatorAccount),
            subjectAccount,
            DID_EBSI_ACCOUNT_TYPE,
            DID_EBSI_ACCOUNT_TYPE,
            DELEGATE_ACCESS,
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "PermissionExists");
      const accesses = await trackAndTrace.getAccessesByDocument(
        documentHash,
        1,
        2,
      );
      expect(accesses).to.be.deep.equal([
        [
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(creatorAccount)),
          ethers.utils.hexlify(subjectAccount),
        ],
        BigInt(2),
        BigInt(2),
        BigInt(1),
        BigInt(1),
      ]);
      const accessesBySubject = await trackAndTrace.getAccessesBySubject(
        ethers.utils.toUtf8Bytes(creatorAccount),
        1,
        1,
      );
      expect(accessesBySubject.items[0]).to.be.equal(
        ethers.utils.formatBytes32String("e68905e6"),
      );
    });

    it("should check if did is creator", async () => {
      expect(
        await trackAndTrace.isCreator(ethers.utils.toUtf8Bytes(creatorAccount)),
      ).to.be.equal(true);
    });

    it("should grant delegate access to a did key", async () => {
      const documentHash = ethers.utils.formatBytes32String("delegate02");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);

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
          ethers.utils.hexlify(subjectAccount),
          ethers.utils.hexlify(creatorAcc),
          0,
        );
    });

    it("should give write access with did key", async () => {
      const documentHash = ethers.utils.formatBytes32String("delegate03");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectKeyAccount = randomWallet.publicKey;

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
      const documentHash = ethers.utils.formatBytes32String("write01");
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
        ethers.utils.toUtf8Bytes(creatorAccount),
        ethers.utils.toUtf8Bytes(delegateAccount),
        DELEGATE_ACCESS,
      );
      const creatorAcc = ethers.utils.toUtf8Bytes(delegateAccount);
      const subjectAcc = ethers.utils.toUtf8Bytes(writerAccount);

      expect(
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
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);
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
      const documentHash = ethers.utils.formatBytes32String("delegate04");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);
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
          ethers.utils.hexlify(subjectAccount),
          ethers.utils.hexlify(creatorAcc),
        );
    });

    it("should revoke write account", async () => {
      const documentHash = ethers.utils.formatBytes32String("write02");
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(writerAccount);
      await grantAccess(documentHash, creatorAcc, subjectAccount, WRITE_ACCESS);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(documentHash, creatorAcc, subjectAccount, WRITE_ACCESS),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(
          documentHash,
          ethers.utils.hexlify(subjectAccount),
          ethers.utils.hexlify(creatorAcc),
        );
    });

    it("should write event and get events", async () => {
      const documentHash = ethers.utils.formatBytes32String("writeEvent01");
      const externalHash = "externalHash";
      const sender = ethers.utils.toUtf8Bytes(creatorAccount);
      const sender2 = ethers.utils.toUtf8Bytes("randomAccount");
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
              sender,
              origin,
              metadata,
            },
            1,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("proof")),
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
              sender: sender2,
              origin,
              metadata,
            },
            1,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("proof")),
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyCreatorOrWriter");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            sender,
            origin,
            metadata,
          }),
      ).to.emit(trackAndTrace, "EventWritten");
      const events = await trackAndTrace.getEvents(documentHash, 1, 1);
      expect(events).to.deep.equal([
        [ethers.utils.keccak256(ethers.utils.toUtf8Bytes(externalHash))],
        BigInt(1),
        BigInt(1),
        BigInt(1),
        BigInt(1),
      ]);
      const event = await trackAndTrace["getEvent(bytes32,bytes32)"](
        documentHash,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(externalHash)),
      );

      expect(event.externalHash).to.be.equal(externalHash);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            sender,
            origin,
            metadata,
          }),
      ).to.be.revertedWithCustomError(trackAndTrace, "ExternalHashExist");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string),uint256,bytes32)"](
            {
              documentHash,
              externalHash: "externalHash2",
              sender,
              origin,
              metadata,
            },
            1000,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("proof")),
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
              sender,
              origin,
              metadata,
            },
            0,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("proof")),
          ),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidTimestamp");

      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster2)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash: "randomHHHash",
            sender: sender2,
            origin,
            metadata,
          }),
      ).to.be.revertedWithCustomError(trackAndTrace, "NotDidController");
      await didRegistryMock.setDidResult(true);
      await expect(
        trackAndTrace
          .connect(broadcaster2)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash: "randomHHHash3",
            sender: sender2,
            origin,
            metadata,
          }),
      ).to.be.revertedWithCustomError(trackAndTrace, "OnlyCreatorOrWriter");
    });
    it("should getAccount Access", async () => {
      const documentHash = ethers.utils.formatBytes32String("getAccess01");
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);
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
      const documentHash = ethers.utils.formatBytes32String("long metadata");
      const externalHash = "externalHash long";
      const sender = ethers.utils.toUtf8Bytes(creatorAccount);
      const origin = "origin";
      const metadata = "metadata";
      const longMetadata = metadata.repeat(5000);
      await createDocument(documentHash);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "createDocument(bytes32,string,string)"
          ](ethers.utils.formatBytes32String("random hash hash"), longMetadata, creatorAccount, { gasLimit: 20000000 }),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidMetadata");
      const WriteEvent = {
        documentHash,
        externalHash,
        sender,
        origin,
        metadata: longMetadata,
      };
      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "writeEvent((bytes32,string,bytes,string,string))"
          ](WriteEvent, { gasLimit: 20000000 }),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidMetadata");
    });

    it("should write event using a did:key", async () => {
      const documentHash = ethers.utils.formatBytes32String("writeEvent02");
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const externalHash = "externalHash";

      const { mnemonic } = config.networks.hardhat.accounts;
      const walletDidKey = ethers.Wallet.fromMnemonic(mnemonic).connect(
        ethers.provider,
      );

      const pubDidKey = walletDidKey.publicKey;
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
            sender: pubDidKey,
            origin,
            metadata,
          }),
      ).to.emit(trackAndTrace, "EventWritten");
    });

    it("should write event using a did:key not sliced", async () => {
      const documentHash = ethers.utils.formatBytes32String(
        "writeEvent02-notsliced",
      );
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const externalHash = "externalHash";

      const { mnemonic } = config.networks.hardhat.accounts;
      const walletDidKey = ethers.Wallet.fromMnemonic(mnemonic).connect(
        ethers.provider,
      );

      const pubDidKey = `${walletDidKey.publicKey}`;
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
            sender: pubDidKey,
            origin,
            metadata,
          }),
      ).to.emit(trackAndTrace, "EventWritten");
    });

    it("should not duplicate document IDs in getAccessesBySubject", async () => {
      const documentHash = ethers.utils.formatBytes32String("document0");
      const creatorBuffer = Buffer.from(creatorAccount);
      await createDocument(documentHash);
      const subjectAccount = ethers.Wallet.createRandom().publicKey;

      // permission to delegate
      await trackAndTrace.grantAccess(
        documentHash,
        creatorBuffer,
        subjectAccount,
        DID_EBSI_ACCOUNT_TYPE,
        DID_KEY_ACCOUNT_TYPE,
        DELEGATE_ACCESS,
      );

      // permission to write
      await trackAndTrace.grantAccess(
        documentHash,
        creatorBuffer,
        subjectAccount,
        DID_EBSI_ACCOUNT_TYPE,
        DID_KEY_ACCOUNT_TYPE,
        WRITE_ACCESS,
      );

      const documents = await trackAndTrace.getAccessesBySubject(
        subjectAccount,
        1,
        10,
      );
      expect(getEthObject(documents)).to.eql({
        items: [documentHash],
        total: ethers.BigNumber.from(1),
        howMany: ethers.BigNumber.from(1),
        prev: ethers.BigNumber.from(1),
        next: ethers.BigNumber.from(1),
      });
    });

    it("should grant, revoke and get accesses", async () => {
      const documentHash = ethers.utils.formatBytes32String("document1");
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

      const documents = await trackAndTrace.getAccessesBySubject(
        subjectKeyAccount,
        1,
        10,
      );
      expect(getEthObject(documents)).to.eql({
        items: [documentHash],
        total: ethers.BigNumber.from(1),
        howMany: ethers.BigNumber.from(1),
        prev: ethers.BigNumber.from(1),
        next: ethers.BigNumber.from(1),
      });

      let accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        subjectKeyAccount,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      await expect(
        trackAndTrace.getGrantedBy(documentHash, subjectKeyAccount, []),
      ).to.be.revertedWithCustomError(trackAndTrace, "InvalidArrayLength");
      expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal([
        // granted by
        ["0x", "0x", "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [false, false, false],
      ]);
    });

    it("test migrationRemoveDocument", async () => {
      const documentHash = ethers.utils.formatBytes32String("documentRemove");
      const documentHash2 = ethers.utils.formatBytes32String("documentRemove2");
      createDocument(documentHash);
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
      const documentHash = ethers.utils.formatBytes32String("document2");
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

      const documents = await trackAndTrace.getAccessesBySubject(
        creatorBuffer,
        1,
        10,
      );
      expect(getEthObject(documents)).to.eql({
        items: [documentHash],
        total: ethers.BigNumber.from(1),
        howMany: ethers.BigNumber.from(1),
        prev: ethers.BigNumber.from(1),
        next: ethers.BigNumber.from(1),
      });

      let accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        creatorBuffer,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal([
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
          expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal(noAccess);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(getEthObject(accesses)).to.deep.equal(noAccess);
        }),
      );
    });

    it("should revoke in cascade (did:key)", async () => {
      const documentHash = randomBytes(32);
      const creatorAcc = `0x${Buffer.from(creatorAccount).toString("hex")}`;
      const { mnemonic } = config.networks.hardhat.accounts;
      const keyWallet = ethers.Wallet.fromMnemonic(mnemonic).connect(
        ethers.provider,
      );
      const delegatee = keyWallet.publicKey;
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
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i];
        // eslint-disable-next-line no-await-in-loop
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
      expect(getEthObject(accesses)).to.deep.equal([
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
          expect(getEthObject(accesses)).to.deep.equal([
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
      expect(getEthObject(accesses)).to.deep.equal(noAccess);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(getEthObject(accesses)).to.deep.equal(noAccess);
        }),
      );
    });
  });
});
