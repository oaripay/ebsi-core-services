import { ethers, upgrades } from "hardhat";
import { BytesLike, Wallet } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import type { TrackAndTrace } from "../src/types";
import { DidRegistryMock } from "../dist";

describe("TrackAndTrace - tests", () => {
  let admin: SignerWithAddress;
  let upgrader: SignerWithAddress;
  let broadcaster: SignerWithAddress;
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
      .grantAccess(documentHash, creatorAcc, subjectAcc, 0, 0, permission);
  }

  before(async () => {
    const signers = (await ethers.getSigners()) as SignerWithAddress[];
    [admin, upgrader, broadcaster] = signers;
    randomWallet = ethers.Wallet.createRandom();
    randomWalletWithSigner = new ethers.Wallet(
      randomWallet.privateKey,
      broadcaster.provider,
    );
    const trackAndTraceFactory = await ethers.getContractFactory(
      "TrackAndTrace",
      {},
    );
    const didMockFactory = await ethers.getContractFactory("DidRegistryMock");

    didRegistryMock =
      (await didMockFactory.deploy()) as unknown as DidRegistryMock;

    trackAndTrace = (await upgrades.deployProxy(trackAndTraceFactory, [
      admin.address,
      upgrader.address,
      didRegistryMock.address,
    ])) as unknown as TrackAndTrace;

    await didRegistryMock.setDidResult(true);

    await trackAndTrace
      .connect(broadcaster)
      ["authoriseDid(string,bool)"](creatorAccount, true);
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
          ["authoriseDid(string,bool)"]("didebsi", true),
      ).to.be.revertedWith("NotDidController");
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
            0,
            0,
            0,
          ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(
          documentHash,
          ethers.utils.hexlify(subjectAccount),
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(creatorAccount)),
          0,
        );
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
          .grantAccess(documentHash, creatorAcc, subjectAccount, 0, 1, 0),
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
      const subjectKeyAccount = `0x${randomWallet.publicKey.slice(4)}`;

      await trackAndTrace
        .connect(broadcaster)
        .grantAccess(documentHash, creatorAcc, subjectKeyAccount, 0, 1, 0);

      await expect(
        trackAndTrace
          .connect(randomWalletWithSigner)
          .grantAccess(
            documentHash,
            subjectKeyAccount,
            subjectKeyAccount,
            1,
            1,
            1,
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
      await trackAndTrace["authoriseDid(string,bool)"](delegateAccount, true);
      await trackAndTrace["authoriseDid(string,bool)"](writerAccount, true);
      await grantAccess(
        documentHash,
        ethers.utils.toUtf8Bytes(creatorAccount),
        ethers.utils.toUtf8Bytes(delegateAccount),
        0,
      );
      const creatorAcc = ethers.utils.toUtf8Bytes(delegateAccount);
      const subjectAcc = ethers.utils.toUtf8Bytes(writerAccount);

      expect(
        await trackAndTrace.grantAccess(
          documentHash,
          creatorAcc,
          subjectAcc,
          0,
          0,
          1,
        ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(documentHash, subjectAcc, creatorAcc, 1);
    });
    it("should revoke delegate account", async () => {
      const documentHash = ethers.utils.formatBytes32String("delegate04");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);
      await grantAccess(documentHash, creatorAcc, subjectAccount, 0);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(documentHash, creatorAcc, subjectAccount, 0),
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
      await grantAccess(documentHash, creatorAcc, subjectAccount, 1);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(documentHash, creatorAcc, subjectAccount, 1),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(
          documentHash,
          ethers.utils.hexlify(subjectAccount),
          ethers.utils.hexlify(creatorAcc),
        );
    });

    it("creator should be able to revoke any access", async () => {
      const documentHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test creator can remove any account"),
      );
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      await grantAccess(
        documentHash,
        creatorAcc,
        ethers.utils.toUtf8Bytes(delegateAccount),
        0,
      );
      await grantAccess(
        documentHash,
        ethers.utils.toUtf8Bytes(delegateAccount),
        ethers.utils.toUtf8Bytes(writerAccount),
        1,
      );

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(
            documentHash,
            ethers.utils.toUtf8Bytes("someOtherCreator"),
            ethers.utils.toUtf8Bytes(writerAccount),
            1,
          ),
      ).to.be.revertedWith("OnlyCreatorOrDelegated");

      await expect(
        trackAndTrace
          .connect(broadcaster)
          .revokeAccess(
            documentHash,
            creatorAcc,
            ethers.utils.toUtf8Bytes(writerAccount),
            1,
          ),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(
          documentHash,
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(writerAccount)),
          ethers.utils.hexlify(creatorAcc),
        );
    });

    it("should write event", async () => {
      const documentHash = ethers.utils.formatBytes32String("writeEvent01");
      const externalHash = "externalHash";
      const sender = ethers.utils.toUtf8Bytes(creatorAccount);
      const origin = "origin";
      const metadata = "metadata";
      await createDocument(documentHash);

      await expect(
        trackAndTrace
          .connect(broadcaster)
          [
            "writeEvent((bytes32,string,bytes,string,string))"
          ]({ documentHash, externalHash, sender, origin, metadata }),
      ).to.emit(trackAndTrace, "EventWritten");
    });
  });
});
