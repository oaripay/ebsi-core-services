import { ethers, network } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";
import { testTprAddress } from "./testAddress";

describe("SmartContract", () => {
  let ts: Contract;
  let policyContractMock: Contract;

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecode = await ethers.provider.getCode(tempPolicyContract.address);
    await network.provider.send("hardhat_setCode", [testTprAddress, bytecode]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);
  });

  beforeEach(async () => {
    const ledgerFactory = await ethers.getContractFactory("LedgerLib", {});
    const ledgerLib = await ledgerFactory.deploy();

    const scFactory = await ethers.getContractFactory("SmartContractLib", {});
    const smartContractLib = await scFactory.deploy();

    const contractFactory = await ethers.getContractFactory(
      "LedgerSCRegistry",
      {
        libraries: {
          SmartContractLib: smartContractLib.address,
          LedgerLib: ledgerLib.address,
        },
      }
    );
    ts = await contractFactory.deploy();
    await ts.initialize(42);
    await ts.setTrustedPoliciesRegistryAddress();
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.properAddress;
  });

  it("should reject no authenticated users", async () => {
    const hash = ethers.utils.sha256("0x0000");
    await policyContractMock.setPolicyResult(false);
    await expect(ts.insertSmartContractInfo("name", "0x00")).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TLSCR:insertSmartContractInfo"
    );

    await expect(
      ts.updateSmartContractInfoById(hash, "0x00")
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TLSCR:updateSmartContractInfoById"
    );

    await expect(
      ts.updateSmartContractInfoByName("name", "0x00")
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TLSCR:updateSmartContractInfoByName"
    );

    await expect(
      ts.updateSmartContractName("oldName", "newName")
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TLSCR:updateSmartContractName"
    );
    await policyContractMock.setPolicyResult(true);
  });

  it("insertSmartContractInfo should failed for empty params", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");
    await expect(ts.insertSmartContractInfo("", info)).to.be.revertedWith(
      "name empty"
    );
    await expect(ts.insertSmartContractInfo("name", [])).to.be.revertedWith(
      "info empty"
    );
  });
  it("insertSmartContractInfo should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");
    await ts.insertSmartContractInfo("smartContract name", info);

    await expect(
      ts.insertSmartContractInfo(
        "smartContract name",
        ethers.utils.toUtf8Bytes("other info")
      )
    ).to.be.revertedWith("name already registered");
    await expect(
      ts.insertSmartContractInfo("othersmartContract name", info)
    ).to.be.revertedWith("info already registered");
  });
  it("insertSmartContractInfo should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    await expect(ts.insertSmartContractInfo("smartContract name", info))
      .to.emit(ts, "SmartContractInfoInserted")
      .withArgs(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("smartContract name")),
        ethers.utils.sha256(info),
        "smartContract name",
        ethers.utils.hexlify(info)
      );
    const cursmartContractInfo = await ts.getLatestSmartContractInfoByName(
      "smartContract name"
    );
    expect(cursmartContractInfo).to.equal(ethers.utils.hexlify(info));
  });

  it("updateSmartContractInfoById should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    const newInfo = ethers.utils.toUtf8Bytes("brand new smartContract info");

    await ts.insertSmartContractInfo("smartContract name", info);
    const cursmartContractInfo = await ts.getLatestSmartContractInfoByName(
      "smartContract name"
    );
    expect(cursmartContractInfo).to.equal(ethers.utils.hexlify(info));
    await expect(
      ts.updateSmartContractInfoById(ethers.utils.sha256(info), newInfo)
    )
      .to.emit(ts, "SmartContractInfoUpdated")
      .withArgs(
        ethers.utils.sha256(info),
        ethers.utils.sha256(newInfo),
        ethers.utils.hexlify(newInfo)
      );
    const smartContractInfo = await ts.getLatestSmartContractInfoByName(
      "smartContract name"
    );
    expect(smartContractInfo).to.equal(ethers.utils.hexlify(newInfo));
  });
  it("updateSmartContractInfoById should failed for empty params", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");
    await expect(
      ts.updateSmartContractInfoById(ethers.constants.HashZero, info)
    ).to.be.revertedWith("smartContractInfoId empty");
    await expect(
      ts.updateSmartContractInfoById(ethers.utils.sha256(info), [])
    ).to.be.revertedWith("info empty");
  });
  it("updateSmartContractInfoById should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    await expect(
      ts.updateSmartContractInfoById(ethers.utils.sha256(info), info)
    ).to.be.revertedWith("smartContract unknown");
  });

  it("updateSmartContractInfoByName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    const newInfo = ethers.utils.toUtf8Bytes("brand new smartContract info");

    const smartContractName = "smartContract name";
    await ts.insertSmartContractInfo(smartContractName, info);
    const cursmartContractInfo = await ts.getLatestSmartContractInfoByName(
      smartContractName
    );
    expect(cursmartContractInfo).to.equal(ethers.utils.hexlify(info));
    await expect(ts.updateSmartContractInfoByName(smartContractName, newInfo))
      .to.emit(ts, "SmartContractInfoUpdated")
      .withArgs(
        ethers.utils.sha256(info),
        ethers.utils.sha256(newInfo),
        ethers.utils.hexlify(newInfo)
      );
    const smartContractInfo = await ts.getLatestSmartContractInfoByName(
      "smartContract name"
    );
    expect(smartContractInfo).to.equal(ethers.utils.hexlify(newInfo));
  });
  it("updateSmartContractInfoByName should failed for empty params", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");
    await expect(ts.updateSmartContractInfoByName("", info)).to.be.revertedWith(
      "name empty"
    );
    await expect(
      ts.updateSmartContractInfoByName("smartContract name", [])
    ).to.be.revertedWith("info empty");
  });
  it("updateSmartContractInfoByName should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    await expect(
      ts.updateSmartContractInfoByName("smartContract name", info)
    ).to.be.revertedWith("smartContract unknown");
  });

  it("updateSmartContractName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");
    const smartContractName = "smartContract name";
    await ts.insertSmartContractInfo(smartContractName, info);
    const newSmartContractName = "brand new smartContract name";
    await expect(
      ts.updateSmartContractName(smartContractName, newSmartContractName)
    )
      .to.emit(ts, "SmartContractNameUpdated")
      .withArgs(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(smartContractName)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(newSmartContractName)),
        smartContractName,
        newSmartContractName
      );

    const newInfo = ethers.utils.toUtf8Bytes("brand new smartContract info");
    await ts.updateSmartContractInfoByName(newSmartContractName, newInfo);
    const smartContractInfo = await ts.getLatestSmartContractInfoByName(
      newSmartContractName
    );
    expect(smartContractInfo).to.equal(ethers.utils.hexlify(newInfo));
    // old name still points to the same smartContractInfoId
    const oldSmartContractInfo = await ts.getLatestSmartContractInfoByName(
      smartContractName
    );
    expect(oldSmartContractInfo).to.equal(ethers.utils.hexlify(newInfo));
  });
  it("updateSmartContractName should failed for empty params", async () => {
    await expect(ts.updateSmartContractName("", "info")).to.be.revertedWith(
      "oldName empty"
    );
    await expect(
      ts.updateSmartContractName("smartContract name", "")
    ).to.be.revertedWith("newName empty");
  });
  it("updateSmartContractName should failed when already registered", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");
    const smartContractName = "smartContract name";
    await ts.insertSmartContractInfo(smartContractName, info);
    const newInfo = ethers.utils.toUtf8Bytes("new smartContract info");
    const newSmartContractName = "new smartContract name";
    await ts.insertSmartContractInfo(newSmartContractName, newInfo);

    await expect(
      ts.updateSmartContractName(smartContractName, newSmartContractName)
    ).to.be.revertedWith("new name exists");
  });

  it("getSmartContractInfoIds should failed with wrong page and pageSize", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    const smartContractName = "smartContract name";
    await ts.insertSmartContractInfo(smartContractName, info);

    // pagesize = 0 should revert
    await expect(ts.getSmartContractInfoIds(1, 0)).to.be.revertedWith(
      "PSize not >0"
    );
    // page  = 0 should revert
    await expect(ts.getSmartContractInfoIds(0, 10)).to.be.revertedWith(
      "Page not >0"
    );

    // pagesize > 50 should revert
    await expect(ts.getSmartContractInfoIds(1, 51)).to.be.revertedWith(
      "PSize not <= 50"
    );
  });
  it("getSmartContractInfoIds should succeed", async () => {
    const smartContractInfoIds: string[] = [];
    for (let i = 1; i < 12; i += 1) {
      const info = ethers.utils.toUtf8Bytes(`info-${i}`);
      const smartContractName = `smartContract name-${i}`;
      const smartContractInfoId = ethers.utils.sha256(info);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertSmartContractInfo(smartContractName, info);
      smartContractInfoIds.push(smartContractInfoId);
    }

    const r0 = await ts.getSmartContractInfoIds(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(smartContractInfoIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getSmartContractInfoIds(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(smartContractInfoIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getSmartContractInfoIds(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getLatestSmartContractInfoById should failed for empty params", async () => {
    await expect(
      ts.getLatestSmartContractInfoById(ethers.constants.HashZero)
    ).to.be.revertedWith("smartContractInfoId empty");
  });
  it("getLatestSmartContractInfoById should fail when smartContractInfoId is unknown", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const smartContractInfoId = ethers.utils.sha256(info);
    await expect(
      ts.getLatestSmartContractInfoById(smartContractInfoId)
    ).to.be.revertedWith("smartContractInfoId unknown");
  });
  it("getLatestSmartContractInfoById should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const smartContractName = `smartContract name`;
    const smartContractInfoId = ethers.utils.sha256(info);

    await ts.insertSmartContractInfo(smartContractName, info);
    const curRes = await ts.getLatestSmartContractInfoById(smartContractInfoId);

    expect(curRes).to.equal(ethers.utils.hexlify(info));
    for (let i = 1; i < 12; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateSmartContractInfoById(smartContractInfoId, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getLatestSmartContractInfoById(smartContractInfoId);

      expect(res).to.equal(ethers.utils.hexlify(newInfo));
    }
  });

  it("getLatestSmartContractInfoByName should failed for empty params", async () => {
    await expect(ts.getLatestSmartContractInfoByName("")).to.be.revertedWith(
      "name empty"
    );
  });
  it("getLatestSmartContractInfoByName should fail when smartContract is unknown", async () => {
    await expect(
      ts.getLatestSmartContractInfoByName("smartContract")
    ).to.be.revertedWith("smartContract unknown");
  });
  it("getLatestSmartContractInfoByName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const smartContractName = `smartContract name`;
    const smartContractInfoId = ethers.utils.sha256(info);

    await ts.insertSmartContractInfo(smartContractName, info);
    const curRes = await ts.getLatestSmartContractInfoByName(smartContractName);

    expect(curRes).to.equal(ethers.utils.hexlify(info));
    for (let i = 1; i < 12; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateSmartContractInfoById(smartContractInfoId, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getLatestSmartContractInfoByName(smartContractName);

      expect(res).to.equal(ethers.utils.hexlify(newInfo));
    }
  });

  it("getSmartContractInfoIdByName should failed for empty params", async () => {
    await expect(ts.getSmartContractInfoIdByName("")).to.be.revertedWith(
      "name empty"
    );
  });
  it("getSmartContractInfoIdByName should fail when smartContract is unknown", async () => {
    await expect(
      ts.getSmartContractInfoIdByName("smartContract")
    ).to.be.revertedWith("smartContract unknown");
  });
  it("getSmartContractInfoIdByName should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const scName = `ledger name`;
    const scInfoId = ethers.utils.sha256(info);

    await ts.insertSmartContractInfo(scName, info);
    const curRes = await ts.getSmartContractInfoIdByName(scName);

    expect(curRes).to.equal(scInfoId);
    for (let i = 1; i < 12; i += 1) {
      const updatedInfo = ethers.utils.toUtf8Bytes(`updated-info-${i}`);
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);
      const newScName = `ledger name-${i}`;
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateSmartContractInfoById(scInfoId, updatedInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getSmartContractInfoIdByName(scName);
      expect(res).to.equal(scInfoId);
      // eslint-disable-next-line no-await-in-loop
      await ts.insertSmartContractInfo(newScName, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res2 = await ts.getSmartContractInfoIdByName(newScName);
      expect(res2).to.equal(ethers.utils.sha256(newInfo));
    }
  });

  it("getSmartContractInfoByRevisionId should failed for empty params", async () => {
    await expect(
      ts.getSmartContractInfoByRevisionId(ethers.constants.HashZero)
    ).to.be.revertedWith("smartContractInfoRevisionId empty");
  });
  it("getSmartContractInfoByRevisionId should return null when smartContractInfoRevId is unknown", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const smartContractInfoId = ethers.utils.sha256(info);
    const infoRes = await ts.getSmartContractInfoByRevisionId(
      smartContractInfoId
    );
    expect(infoRes).to.equal("0x");
  });
  it("getSmartContractInfoByRevisionId should succeed", async () => {
    const info = ethers.utils.toUtf8Bytes(`info`);
    const smartContractName = `smartContract name`;
    const smartContractInfoId = ethers.utils.sha256(info);

    await ts.insertSmartContractInfo(smartContractName, info);
    const curRes = await ts.getSmartContractInfoByRevisionId(
      smartContractInfoId
    );
    expect(curRes).to.equal(ethers.utils.hexlify(info));
    for (let i = 1; i < 12; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);
      const smartContractInfoRevId = ethers.utils.sha256(newInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateSmartContractInfoById(smartContractInfoId, newInfo);
      // eslint-disable-next-line no-await-in-loop
      const res = await ts.getSmartContractInfoByRevisionId(
        smartContractInfoRevId
      );

      expect(res).to.equal(ethers.utils.hexlify(newInfo));
    }
  });

  it("getSmartContractInfoRevisionIds should failed for empty params", async () => {
    await expect(
      ts.getSmartContractInfoRevisionIds(ethers.constants.HashZero, 1, 10)
    ).to.be.revertedWith("smartContractInfoId empty");
  });
  it("getSmartContractInfoRevisionIds should failed with wrong page and pageSize", async () => {
    const info = ethers.utils.toUtf8Bytes("smartContract info");

    const smartContractName = "smartContract name";
    await ts.insertSmartContractInfo(smartContractName, info);
    const smartContractInfoId = ethers.utils.sha256(info);
    // pagesize = 0 should revert
    await expect(
      ts.getSmartContractInfoRevisionIds(smartContractInfoId, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getSmartContractInfoRevisionIds(smartContractInfoId, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getSmartContractInfoRevisionIds(smartContractInfoId, 1, 51)
    ).to.be.revertedWith("PSize not <= 50");
  });
  it("getSmartContractInfoRevisionIds should succeed", async () => {
    const smartContractInfoRevIds: string[] = [];
    const info = ethers.utils.toUtf8Bytes(`info`);
    const smartContractName = `smartContract name`;
    const smartContractInfoId = ethers.utils.sha256(info);

    await ts.insertSmartContractInfo(smartContractName, info);
    smartContractInfoRevIds.push(smartContractInfoId);
    for (let i = 1; i < 11; i += 1) {
      const newInfo = ethers.utils.toUtf8Bytes(`info-${i}`);
      const smartContractInfoRevId = ethers.utils.sha256(newInfo);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updateSmartContractInfoByName(smartContractName, newInfo);
      smartContractInfoRevIds.push(smartContractInfoRevId);
    }

    const r0 = await ts.getSmartContractInfoRevisionIds(
      smartContractInfoId,
      1,
      1
    );
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(smartContractInfoRevIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getSmartContractInfoRevisionIds(
      smartContractInfoId,
      1,
      11
    );
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(smartContractInfoRevIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getSmartContractInfoRevisionIds(
      smartContractInfoId,
      5,
      11
    );
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
