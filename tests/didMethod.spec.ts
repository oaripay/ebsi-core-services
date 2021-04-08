import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("Did Method", () => {
  let ts: Contract;

  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();

    const policyFactory = await ethers.getContractFactory("PolicyLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const policyLib = await policyFactory.deploy();

    const adminFactory = await ethers.getContractFactory("AdministratorLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const adminLib = await adminFactory.deploy();

    const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
    const hashAlgoLib = await hashAlgoFactory.deploy();

    const didTimestampFactory = await ethers.getContractFactory(
      "DidTimestampLib"
    );
    const didTimestampLib = await didTimestampFactory.deploy();

    const didMethodFactory = await ethers.getContractFactory("DidMethodLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const didMethodLib = await didMethodFactory.deploy();

    const didRecordFactory = await ethers.getContractFactory("DidRecordLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const didRecordLib = await didRecordFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        PolicyLib: policyLib.address,
        AdministratorLib: adminLib.address,
        HashAlgoLib: hashAlgoLib.address,
        DidTimestampLib: didTimestampLib.address,
        DidMethodLib: didMethodLib.address,
        DidRecordLib: didRecordLib.address,
      },
    });
    ts = await contractFactory.deploy();
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    expect(ts.address).to.properAddress;
  });
  it("insertDidMethod should revert for incorrect parameters", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    await expect(
      ts.insertDidMethod("", "ledger", [[8]], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("method empty");
    await expect(
      ts.insertDidMethod("method", "", [[8]], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("ledger empty");
    await expect(
      ts.insertDidMethod("method", "ledger", [], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("methodSpec==0");
    await expect(
      ts.insertDidMethod("method", "ledger", [[8]], [], 1, 2, 1)
    ).to.be.revertedWith("methodSpecHash==0");
    await expect(
      ts.insertDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 0)
    ).to.be.revertedWith("status undefined");
  });
  it("insertDidMethod should revert when inserted twice", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    ts.insertDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 1);
    await expect(
      ts.insertDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("method exist");
  });
  it("insertDidMethod should work", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    await expect(
      ts.insertDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 1)
    )
      .to.emit(ts, "AddNewDidMethod")
      .withArgs(
        "method",
        "ledger",
        "method",
        "ledger",
        ["0x08"],
        [bytes32],
        1,
        2,
        1
      );
  });

  it("updateDidMethod should revert for incorrect parameters", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    await expect(
      ts.updateDidMethod("", "ledger", [[8]], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("method empty");
    await expect(
      ts.updateDidMethod("method", "", [[8]], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("ledger empty");
    await expect(
      ts.updateDidMethod("method", "ledger", [], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("methodSpec==0");
    await expect(
      ts.updateDidMethod("method", "ledger", [[8]], [], 1, 2, 1)
    ).to.be.revertedWith("methodSpecHash==0");
    await expect(
      ts.updateDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 0)
    ).to.be.revertedWith("status undefined");
  });
  it("updateDidMethod should revert for a new method", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    await expect(
      ts.updateDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 1)
    ).to.be.revertedWith("method unknown");
  });
  it("updateDidMethod should work", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    ts.insertDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 1);
    await expect(
      ts.updateDidMethod("method", "ledger2", [[8]], [bytes32], 1, 2, 1)
    )
      .to.emit(ts, "UpdateDidMethod")
      .withArgs(
        "method",
        "ledger2",
        "method",
        "ledger2",
        ["0x08"],
        [bytes32],
        1,
        2,
        1
      );
  });
  it("getDidMethodByName should succeed", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    await expect(
      ts.insertDidMethod("method", "ledger", [[8]], [bytes32], 1, 2, 1)
    ).to.emit(ts, "AddNewDidMethod");
    const receipt = await ts.getDidMethodByName("method");
    expect(receipt.methodName).to.equal("method");
    expect(receipt.ledgerName).to.equal("ledger");
    expect(receipt.methodSpec).to.deep.equal(["0x08"]);
    expect(receipt.methodSpecHash).to.deep.equal([bytes32]);
    expect(receipt.notBefore).to.equal(1);
    expect(receipt.notAfter).to.equal(2);
    expect(receipt.status).to.equal(1);
  });

  it("getDidMethodIds should failed with wrong page and pageSize", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    for (let i = 1; i < 12; i += 1) {
      const method = `method-${i}`;
      const ledger = `ledger-${i}`;
      // Id starts from zero

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.insertDidMethod(method, ledger, [[8]], [bytes32], 1, 2, 1)
      ).to.emit(ts, "AddNewDidMethod");
    }
    // pagesize = 0 should revert
    await expect(ts.getDidMethodIds(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getDidMethodIds(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getDidMethodIds(1, 51)).to.be.revertedWith(
      "PSize not <=50"
    );
  });

  it("getDidMethodIds should work with correct page and pageSize", async () => {
    const resHashIds: string[] = [];
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    for (let i = 1; i < 12; i += 1) {
      const method = `method-${i}`;
      const ledger = `ledger-${i}`;
      // Id starts from zero
      resHashIds.push(ethers.utils.sha256(ethers.utils.toUtf8Bytes(method)));
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.insertDidMethod(method, ledger, [[8]], [bytes32], 1, 2, 1)
      ).to.emit(ts, "AddNewDidMethod");
    }

    const r0 = await ts.getDidMethodIds(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resHashIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidMethodIds(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resHashIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidMethodIds(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });

  it("getDidMethods should failed with wrong page and pageSize", async () => {
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    for (let i = 1; i < 12; i += 1) {
      const method = `method-${i}`;
      const ledger = `ledger-${i}`;
      // Id starts from zero

      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.insertDidMethod(method, ledger, [[8]], [bytes32], 1, 2, 1)
      ).to.emit(ts, "AddNewDidMethod");
    }
    // pagesize = 0 should revert
    await expect(ts.getDidMethods(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getDidMethods(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getDidMethods(1, 51)).to.be.revertedWith("PSize not <=50");
  });

  it("getDidMethods should work with correct page and pageSize", async () => {
    const methods: string[] = [];
    const bytes32 = ethers.utils.sha256(ethers.utils.toUtf8Bytes("hash"));
    for (let i = 1; i < 12; i += 1) {
      const method = `method-${i}`;
      const ledger = `ledger-${i}`;
      // Id starts from zero
      methods.push(method);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(
        ts.insertDidMethod(method, ledger, [[8]], [bytes32], 1, 2, 1)
      ).to.emit(ts, "AddNewDidMethod");
    }

    const r0 = await ts.getDidMethods(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(methods.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getDidMethods(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(methods[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getDidMethods(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
