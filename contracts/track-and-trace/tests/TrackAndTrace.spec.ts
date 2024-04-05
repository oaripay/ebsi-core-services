import { ethers, upgrades, config } from "hardhat";
import { BytesLike, Wallet } from "ethers";
import { randomBytes } from "crypto";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { expect } from "chai";
import type { TrackAndTrace } from "../src/types";
import { DidRegistryMock } from "../dist";

const DELEGATE_ACCESS = 0;
const WRITE_ACCESS = 1;
const CREATOR_ACCESS = 2;
const DID_EBSI_ACCOUNT_TYPE = 0;
const DID_KEY_ACCOUNT_TYPE = 1;

const num = ethers.BigNumber.from;

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
  let admin: SignerWithAddress;
  let upgrader: SignerWithAddress;
  let broadcaster: SignerWithAddress;
  const supportOfficeAccount = "didSupportOffice";
  const creatorAccount = "didEbsi";
  const writerAccount = "didWriter";
  const delegateAccount = "didDelegate";
  let randomWallet: Wallet;
  let randomWalletWithSigner: SignerWithAddress;
  let trackAndTrace: TrackAndTrace;
  let didRegistryMock: DidRegistryMock;

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
    const signers = (await ethers.getSigners()) as SignerWithAddress[];
    [admin, upgrader, broadcaster] = signers;
    randomWallet = ethers.Wallet.createRandom();
    randomWalletWithSigner = new ethers.Wallet(
      randomWallet.privateKey,
      broadcaster.provider,
    );

    const trackAndTraceLibFactory = await ethers.getContractFactory(
      "TrackAndTraceLib",
      {},
    );
    const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

    const trackAndTraceFactory = await ethers.getContractFactory(
      "TrackAndTrace",
      { libraries: { TrackAndTraceLib: trackAndTraceLibContract.address } },
    );
    const didMockFactory = await ethers.getContractFactory("DidRegistryMock");

    didRegistryMock =
      (await didMockFactory.deploy()) as unknown as DidRegistryMock;

    trackAndTrace = (await upgrades.deployProxy(
      trackAndTraceFactory,
      [admin.address, upgrader.address, didRegistryMock.address],
      { unsafeAllowLinkedLibraries: true },
    )) as unknown as TrackAndTrace;

    await didRegistryMock.setDidResult(true);

    await trackAndTrace
      .connect(broadcaster)
      .authoriseDid(supportOfficeAccount, creatorAccount, true);
  });
  describe("Basic", () => {
    it("should be already initialized", async () => {
      await expect(
        trackAndTrace.initialize(
          admin.address,
          upgrader.address,
          didRegistryMock.address,
        ),
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
    it("should be reverted if the wallet is not controller of did ebsi", async () => {
      await didRegistryMock.setDidResult(false);
      await expect(
        trackAndTrace
          .connect(broadcaster)
          .authoriseDid("didebsi", creatorAccount, true),
      ).to.be.revertedWith("NotDidController");
    });
    it("should revert if user not upgrader", async () => {
      const trackAndTraceLibFactory = await ethers.getContractFactory(
        "TrackAndTraceLib",
        {},
      );
      const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

      const trackAndTraceFactory = await ethers.getContractFactory(
        "TrackAndTrace",
        { libraries: { TrackAndTraceLib: trackAndTraceLibContract.address } },
      );
      const newTrackAndTraceImplementation =
        await trackAndTraceFactory.deploy();

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .upgradeTo(newTrackAndTraceImplementation.address),
      ).to.be.revertedWith("NotUpgrader");
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
      ).to.revertedWith("InvalidTimestamp");
    });

    it("should create document", async () => {
      const documentHash = ethers.utils.formatBytes32String("e68905e6");
      const metadata = "metadata";
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
        ethers.BigNumber.from(11),
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(2),
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
        ethers.BigNumber.from(2),
        ethers.BigNumber.from(2),
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
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
      await createDocument(documentHash);
      await trackAndTrace.authoriseDid(
        supportOfficeAccount,
        delegateAccount,
        true,
      );
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
      ).to.be.revertedWith("OnlyAccessGranter");
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
      const origin = "origin";
      const metadata = "metadata";
      const longMetadata = metadata.repeat(4000);
      await createDocument(documentHash);

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
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
      ]);
      const event = await trackAndTrace.getEvent(
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
      ).to.be.revertedWith("ExternalHashExist");
      await expect(
        trackAndTrace
          .connect(broadcaster)
          ["writeEvent((bytes32,string,bytes,string,string))"]({
            documentHash,
            externalHash,
            sender,
            origin,
            longMetadata,
          }),
      ).to.be.revertedWith("");
    });

    it("should write event using a did:key", async () => {
      const documentHash = ethers.utils.formatBytes32String("writeEvent02");
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const externalHash = "externalHash";

      const { mnemonic, path } = config.networks.hardhat.accounts;
      const walletDidKeyWithoutProvider = ethers.Wallet.fromMnemonic(
        mnemonic,
        `${path}/3`,
      );
      const walletDidKey = new ethers.Wallet(
        walletDidKeyWithoutProvider.privateKey,
        broadcaster.provider,
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

      const { mnemonic, path } = config.networks.hardhat.accounts;
      const walletDidKeyWithoutProvider = ethers.Wallet.fromMnemonic(
        mnemonic,
        `${path}/3`,
      );
      const walletDidKey = new ethers.Wallet(
        walletDidKeyWithoutProvider.privateKey,
        broadcaster.provider,
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
        total: num(1),
        howMany: num(1),
        prev: num(1),
        next: num(1),
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
        total: num(1),
        howMany: num(1),
        prev: num(1),
        next: num(1),
      });

      let accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        subjectKeyAccount,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      expect(getEthObject(accesses)).to.eql([
        // granted by
        [creatorAcc, creatorAcc, "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [true, true, false],
      ]);

      // revoke delegate access
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
      expect(getEthObject(accesses)).to.eql([
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
      expect(getEthObject(accesses)).to.eql([
        // granted by
        ["0x", "0x", "0x"],
        // granted by type
        [DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE, DID_EBSI_ACCOUNT_TYPE],
        // access: [delegate, write, creator]
        [false, false, false],
      ]);
    });

    it("should grant and revoke accesses to the creator", async () => {
      await didRegistryMock.setDidResult(true);
      const creator = "did:ebsi:creator1";
      const creatorBuffer = `0x${Buffer.from(creator).toString("hex")}`;
      const documentHash = ethers.utils.formatBytes32String("document2");
      await trackAndTrace.authoriseDid(supportOfficeAccount, creator, true);
      await trackAndTrace["createDocument(bytes32,string,string)"](
        documentHash,
        "metadata",
        creator,
      );

      // grant delegate access to himself
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
        total: num(1),
        howMany: num(1),
        prev: num(1),
        next: num(1),
      });

      let accesses = await trackAndTrace.getGrantedBy(
        documentHash,
        creatorBuffer,
        [DELEGATE_ACCESS, WRITE_ACCESS, CREATOR_ACCESS],
      );
      expect(getEthObject(accesses)).to.eql([
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
      expect(getEthObject(accesses)).to.eql([
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
      expect(getEthObject(accesses)).to.eql([
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
      ).to.be.revertedWith("TooManyDelegatedChildren");
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
      expect(getEthObject(accesses)).to.eql([
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
          expect(getEthObject(accesses)).to.eql([
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
      expect(getEthObject(accesses)).to.eql(noAccess);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(getEthObject(accesses)).to.eql(noAccess);
        }),
      );
    });

    it("should revoke in cascade (did:key)", async () => {
      const documentHash = randomBytes(32);
      const creatorAcc = `0x${Buffer.from(creatorAccount).toString("hex")}`;
      const { mnemonic, path } = config.networks.hardhat.accounts;
      const walletNoProvider = ethers.Wallet.fromMnemonic(
        mnemonic,
        `${path}/3`,
      );
      const keyWallet = new ethers.Wallet(
        walletNoProvider.privateKey,
        broadcaster.provider,
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
      expect(getEthObject(accesses)).to.eql([
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
          expect(getEthObject(accesses)).to.eql([
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
      expect(getEthObject(accesses)).to.eql(noAccess);

      await Promise.all(
        accounts.map(async (account) => {
          accesses = await trackAndTrace.getGrantedBy(documentHash, account, [
            DELEGATE_ACCESS,
            WRITE_ACCESS,
            CREATOR_ACCESS,
          ]);
          expect(getEthObject(accesses)).to.eql(noAccess);
        }),
      );
    });
  });
});
