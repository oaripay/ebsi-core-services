import { ethers, upgrades } from "hardhat";
import { BytesLike } from "ethers";
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
  const delegateAccountKey = "didKeyDelegate";
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
      ).to.be.revertedWith("InvalidAccess");
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
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);

      expect(
        await trackAndTrace
          .connect(broadcaster)
          .grantAccess(documentHash, creatorAcc, subjectAccount, 0, 0, 0),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(documentHash, subjectAccount, creatorAccount, 0);
    });
    it("should grant delegate access to a did key", async () => {
      const documentHash = ethers.utils.formatBytes32String("delegate02");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);

      expect(
        await trackAndTrace
          .connect(broadcaster)
          .grantAccess(documentHash, creatorAcc, subjectAccount, 0, 1, 0),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(documentHash, subjectAccount, creatorAccount, 0);
    });
    it("should give write access with did key", async () => {
      const documentHash = ethers.utils.formatBytes32String("delegate03");
      await didRegistryMock.setDidResult(true);
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectKeyAccount = ethers.utils.toUtf8Bytes(delegateAccountKey);
      const subjectAccount = ethers.utils.toUtf8Bytes(delegateAccount);

      await trackAndTrace
        .connect(broadcaster)
        .grantAccess(documentHash, creatorAcc, subjectKeyAccount, 0, 1, 0);

      expect(
        await trackAndTrace
          .connect(broadcaster)
          .grantAccess(
            documentHash,
            subjectKeyAccount,
            subjectAccount,
            1,
            1,
            1,
          ),
      )
        .to.emit(trackAndTrace, "AccessGranted")
        .withArgs(documentHash, subjectAccount, subjectKeyAccount, 1);
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

      expect(
        await trackAndTrace
          .connect(broadcaster)
          .revokeAccess(documentHash, creatorAcc, subjectAccount, 0),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(documentHash, subjectAccount, creatorAccount, 0);
    });
    it("should revoke write account", async () => {
      const documentHash = ethers.utils.formatBytes32String("write02");
      await createDocument(documentHash);
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      const subjectAccount = ethers.utils.toUtf8Bytes(writerAccount);
      await grantAccess(documentHash, creatorAcc, subjectAccount, 1);

      expect(
        await trackAndTrace
          .connect(broadcaster)
          .revokeAccess(documentHash, creatorAcc, subjectAccount, 1),
      )
        .to.emit(trackAndTrace, "AccessRevoked")
        .withArgs(documentHash, subjectAccount, creatorAccount, 1);
    });
    it("should write event", async () => {
      const documentHash = ethers.utils.formatBytes32String("writeEvent01");
      const eventHash = ethers.utils.formatBytes32String("writeEventHash");
      const externalHash = "externalHash";
      const sender = "sender";
      const origin = "origin";
      const metadata = "metadata";
      const creatorAcc = ethers.utils.toUtf8Bytes(creatorAccount);
      await createDocument(documentHash);

      expect(
        await trackAndTrace
          .connect(broadcaster)
          [
            "writeEvent((bytes32,bytes32,string,string,string,string),bytes)"
          ]({ documentHash, eventHash, externalHash, sender, origin, metadata }, creatorAcc),
      ).to.emit(trackAndTrace, "EventWritten");
    });
  });
});
