import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("Ledger", () => {
  let ts: Contract;

  beforeEach(async () => {
    const ledgerFactory = await ethers.getContractFactory("LedgerLib", {});
    const ledgerLib = await ledgerFactory.deploy();

    const scFactory = await ethers.getContractFactory("SmartContractLib", {});
    const smartContractLib = await scFactory.deploy();

    const contractFactory = await ethers.getContractFactory(
      "LedgerSCRegistry",
      {
        libraries: {
          LedgerLib: ledgerLib.address,
          SmartContractLib: smartContractLib.address,
        },
      }
    );
    ts = await contractFactory.deploy();
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    expect(ts.address).to.properAddress;
  });
  it("insertLedgerInfo should failed for empty params", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");
    await expect(ts.insertLedgerInfo("", info)).to.be.revertedWith(
      "name empty"
    );
    await expect(ts.insertLedgerInfo("name", [])).to.be.revertedWith(
      "info empty"
    );
  });
  it("insertLedgerInfo should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");
    await ts.insertLedgerInfo("ledger name", info);

    await expect(
      ts.insertLedgerInfo("ledger name", ethers.utils.toUtf8Bytes("other info"))
    ).to.be.revertedWith("name already registered");
    await expect(
      ts.insertLedgerInfo("otherledger name", info)
    ).to.be.revertedWith("info already registered");
  });
  it("insertLedgerInfo should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    await expect(ts.insertLedgerInfo("ledger name", info))
      .to.emit(ts, "LedgerInfoInserted")
      .withArgs(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ledger name")),
        ethers.utils.sha256(info),
        "ledger name",
        ethers.utils.hexlify(info)
      );
    const curledgerInfo = await ts.getLatestLedgerInfoByName("ledger name");
    expect(curledgerInfo).to.equal(ethers.utils.hexlify(info));
  });

  it("updateLedgerInfoById should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    const newInfo = ethers.utils.toUtf8Bytes("brand new ledger info");

    await ts.insertLedgerInfo("ledger name", info);
    const curledgerInfo = await ts.getLatestLedgerInfoByName("ledger name");
    expect(curledgerInfo).to.equal(ethers.utils.hexlify(info));
    await expect(ts.updateLedgerInfoById(ethers.utils.sha256(info), newInfo))
      .to.emit(ts, "LedgerInfoUpdated")
      .withArgs(
        ethers.utils.sha256(info),
        ethers.utils.sha256(newInfo),
        ethers.utils.hexlify(newInfo)
      );
    const ledgerInfo = await ts.getLatestLedgerInfoByName("ledger name");
    expect(ledgerInfo).to.equal(ethers.utils.hexlify(newInfo));
  });
  it("updateLedgerInfoById should failed for empty params", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");
    await expect(
      ts.updateLedgerInfoById(ethers.constants.HashZero, info)
    ).to.be.revertedWith("ledgerInfoId empty");
    await expect(
      ts.updateLedgerInfoById(ethers.utils.sha256(info), [])
    ).to.be.revertedWith("info empty");
  });
  it("updateLedgerInfoById should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    await expect(
      ts.updateLedgerInfoById(ethers.utils.sha256(info), info)
    ).to.be.revertedWith("ledger unknown");
  });

  it("updateLedgerInfoByName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    const newInfo = ethers.utils.toUtf8Bytes("brand new ledger info");

    const ledgerName = "ledger name";
    await ts.insertLedgerInfo(ledgerName, info);
    const curledgerInfo = await ts.getLatestLedgerInfoByName(ledgerName);
    expect(curledgerInfo).to.equal(ethers.utils.hexlify(info));
    await expect(ts.updateLedgerInfoByName(ledgerName, newInfo))
      .to.emit(ts, "LedgerInfoUpdated")
      .withArgs(
        ethers.utils.sha256(info),
        ethers.utils.sha256(newInfo),
        ethers.utils.hexlify(newInfo)
      );
    const ledgerInfo = await ts.getLatestLedgerInfoByName("ledger name");
    expect(ledgerInfo).to.equal(ethers.utils.hexlify(newInfo));
  });
  it("updateLedgerInfoByName should failed for empty params", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");
    await expect(ts.updateLedgerInfoByName("", info)).to.be.revertedWith(
      "name empty"
    );
    await expect(
      ts.updateLedgerInfoByName("ledger name", [])
    ).to.be.revertedWith("info empty");
  });
  it("updateLedgerInfoByName should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    await expect(
      ts.updateLedgerInfoByName("ledger name", info)
    ).to.be.revertedWith("ledger unknown");
  });

  it("updateLedgerName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");
    const ledgerName = "ledger name";
    await ts.insertLedgerInfo(ledgerName, info);
    const newLedgerName = "brand new ledger name";
    await expect(ts.updateLedgerName(ledgerName, newLedgerName))
      .to.emit(ts, "LedgerNameUpdated")
      .withArgs(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ledgerName)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(newLedgerName)),
        ledgerName,
        newLedgerName
      );

    const newInfo = ethers.utils.toUtf8Bytes("brand new ledger info");
    await ts.updateLedgerInfoByName(newLedgerName, newInfo);
    const ledgerInfo = await ts.getLatestLedgerInfoByName(newLedgerName);
    expect(ledgerInfo).to.equal(ethers.utils.hexlify(newInfo));
    // old name still points to the same ledgerInfoId
    const oldLedgerInfo = await ts.getLatestLedgerInfoByName(ledgerName);
    expect(oldLedgerInfo).to.equal(ethers.utils.hexlify(newInfo));
  });
  it("updateLedgerName should failed for empty params", async () => {
    await expect(ts.updateLedgerName("", "info")).to.be.revertedWith(
      "oldName empty"
    );
    await expect(ts.updateLedgerName("ledger name", "")).to.be.revertedWith(
      "newName empty"
    );
  });
  it("updateLedgerName should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");
    const ledgerName = "ledger name";
    await ts.insertLedgerInfo(ledgerName, info);
    const newInfo = ethers.utils.toUtf8Bytes("new ledger info");
    const newLedgerName = "new ledger name";
    await ts.insertLedgerInfo(newLedgerName, newInfo);

    await expect(
      ts.updateLedgerName(ledgerName, newLedgerName)
    ).to.be.revertedWith("new name exists");
  });

  it("getLedgerInfoIds should failed with wrong page and pageSize", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    const ledgerName = "ledger name";
    await ts.insertLedgerInfo(ledgerName, info);

    // pagesize = 0 should revert
    await expect(ts.getLedgerInfoIds(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getLedgerInfoIds(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getLedgerInfoIds(1, 51)).to.be.revertedWith(
      "PSize not <= 50"
    );
  });
  it("getLedgerInfoIds should succeed", async () => {
    const ledgerInfoIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const info = ethers.utils.toUtf8Bytes(`info-${i}`);
      const ledgerName = `ledger name-${i}`;
      const ledgerInfoId = ethers.utils.sha256(info);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertLedgerInfo(ledgerName, info);
      ledgerInfoIds.push(ledgerInfoId);
    }

    const r0 = await ts.getLedgerInfoIds(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ledgerInfoIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getLedgerInfoIds(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ledgerInfoIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getLedgerInfoIds(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getLatestLedgerInfoById should failed for empty params", async () => {
    await expect(
      ts.getLatestLedgerInfoById(ethers.constants.HashZero)
    ).to.be.revertedWith("ledgerInfoId empty");
  });
  it("getLatestLedgerInfoById should fail when ledgerInfoId is unknown", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerInfoId = ethers.utils.sha256(info);
    await expect(ts.getLatestLedgerInfoById(ledgerInfoId)).to.be.revertedWith(
      "ledgerInfoId unknown"
    );
  });
  it("getLatestLedgerInfoById should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerName = `ledger name`;
    const ledgerInfoId = ethers.utils.sha256(info);

    await ts.insertLedgerInfo(ledgerName, info);
    const curRes = await ts.getLatestLedgerInfoById(ledgerInfoId);

    expect(curRes).to.equal(ethers.utils.hexlify(info));
    for (let i = 1; i < 12; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateLedgerInfoById(ledgerInfoId, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getLatestLedgerInfoById(ledgerInfoId);

      expect(res).to.equal(ethers.utils.hexlify(newInfo));
    }
  });

  it("getLatestLedgerInfoByName should failed for empty params", async () => {
    await expect(ts.getLatestLedgerInfoByName("")).to.be.revertedWith(
      "name empty"
    );
  });
  it("getLatestLedgerInfoByName should fail when ledger is unknown", async () => {
    await expect(ts.getLatestLedgerInfoByName("ledger")).to.be.revertedWith(
      "ledger unknown"
    );
  });
  it("getLatestLedgerInfoByName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerName = `ledger name`;
    const ledgerInfoId = ethers.utils.sha256(info);

    await ts.insertLedgerInfo(ledgerName, info);
    const curRes = await ts.getLatestLedgerInfoByName(ledgerName);

    expect(curRes).to.equal(ethers.utils.hexlify(info));
    for (let i = 1; i < 12; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateLedgerInfoById(ledgerInfoId, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getLatestLedgerInfoByName(ledgerName);

      expect(res).to.equal(ethers.utils.hexlify(newInfo));
    }
  });

  it("getLedgerInfoIdByName should failed for empty params", async () => {
    await expect(ts.getLedgerInfoIdByName("")).to.be.revertedWith("name empty");
  });
  it("getLedgerInfoIdByName should fail when ledger is unknown", async () => {
    await expect(ts.getLedgerInfoIdByName("ledger")).to.be.revertedWith(
      "ledger unknown"
    );
  });
  it("getLedgerInfoIdByName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerName = `ledger name`;
    const ledgerInfoId = ethers.utils.sha256(info);

    await ts.insertLedgerInfo(ledgerName, info);
    const curRes = await ts.getLedgerInfoIdByName(ledgerName);

    expect(curRes).to.equal(ledgerInfoId);
    for (let i = 1; i < 12; i += 1) {
      const updatedInfo = ethers.utils.toUtf8Bytes(`updated-info-${i}`);
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);
      const newledgerName = `ledger name-${i}`;
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateLedgerInfoById(ledgerInfoId, updatedInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getLedgerInfoIdByName(ledgerName);
      expect(res).to.equal(ledgerInfoId);
      // eslint-disable-next-line no-await-in-loop
      await ts.insertLedgerInfo(newledgerName, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res2 = await ts.getLedgerInfoIdByName(newledgerName);
      expect(res2).to.equal(ethers.utils.sha256(newInfo));
    }
  });

  it("getLedgerInfoByRevisionId should failed for empty params", async () => {
    await expect(
      ts.getLedgerInfoByRevisionId(ethers.constants.HashZero)
    ).to.be.revertedWith("ledgerInfoRevisionId empty");
  });
  it("getLedgerInfoByRevisionId should return null when ledgerInfoRevId is unknown", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerInfoId = ethers.utils.sha256(info);
    const infoRes = await ts.getLedgerInfoByRevisionId(ledgerInfoId);
    expect(infoRes).to.equal("0x");
  });
  it("getLedgerInfoByRevisionId should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerName = `ledger name`;
    const ledgerInfoId = ethers.utils.sha256(info);

    await ts.insertLedgerInfo(ledgerName, info);
    const curRes = await ts.getLedgerInfoByRevisionId(ledgerInfoId);
    expect(curRes).to.equal(ethers.utils.hexlify(info));
    for (let i = 1; i < 12; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);
      const ledgerInfoRevId = ethers.utils.sha256(newInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateLedgerInfoById(ledgerInfoId, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getLedgerInfoByRevisionId(ledgerInfoRevId);

      expect(res).to.equal(ethers.utils.hexlify(newInfo));
    }
  });

  it("getLedgerInfoRevisionIds should failed for empty params", async () => {
    await expect(
      ts.getLedgerInfoRevisionIds(ethers.constants.HashZero, 1, 10)
    ).to.be.revertedWith("ledgerInfoId empty");
  });
  it("getLedgerInfoRevisionIds should failed with wrong page and pageSize", async () => {
    const info = ethers.utils.toUtf8Bytes("ledger info");

    const ledgerName = "ledger name";
    await ts.insertLedgerInfo(ledgerName, info);
    const ledgerInfoId = ethers.utils.sha256(info);
    // pagesize = 0 should revert
    await expect(
      ts.getLedgerInfoRevisionIds(ledgerInfoId, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getLedgerInfoRevisionIds(ledgerInfoId, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getLedgerInfoRevisionIds(ledgerInfoId, 1, 51)
    ).to.be.revertedWith("PSize not <= 50");
  });
  it("getLedgerInfoRevisionIds should succeed", async () => {
    const ledgerInfoRevIds: string[] = [];
    const info = ethers.utils.toUtf8Bytes(`info`);
    const ledgerName = `ledger name`;
    const ledgerInfoId = ethers.utils.sha256(info);

    await ts.insertLedgerInfo(ledgerName, info);
    ledgerInfoRevIds.push(ledgerInfoId);
    for (let i = 1; i < 11; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);
      const ledgerInfoRevId = ethers.utils.sha256(newInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateLedgerInfoByName(ledgerName, newInfo);
      ledgerInfoRevIds.push(ledgerInfoRevId);
    }

    const r0 = await ts.getLedgerInfoRevisionIds(ledgerInfoId, 1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ledgerInfoRevIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getLedgerInfoRevisionIds(ledgerInfoId, 1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(ledgerInfoRevIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getLedgerInfoRevisionIds(ledgerInfoId, 5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
