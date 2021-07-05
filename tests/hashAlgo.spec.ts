import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("Hash Algorithm", () => {
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
  it("getHashAlgorithmById should succeed", async () => {
    await expect(
      ts.insertHashAlgorithm(256, "SHA256", "oid256", 1, "blake2s-232")
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(0);
    expect(receipt.outputLength).to.equal(256);
    expect(receipt.ianaName).to.equal("SHA256");
    expect(receipt.oid).to.equal("oid256");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("blake2s-232");

    await ts.insertHashAlgorithm(256, "SHA2-256", "oid2256", 1, "blake2s-232");
    await ts.insertHashAlgorithm(512, "SHA512", "oid2", 1, "blake2s-242");
    await ts.insertHashAlgorithm(256, "SHA3-256", "oid3", 1, "blake2s-252");
    const receipt2 = await ts.getHashAlgorithmById(2);
    expect(receipt2.outputLength).to.equal(512);
    expect(receipt2.ianaName).to.equal("SHA512");
    expect(receipt2.oid).to.equal("oid2");
    expect(receipt2.status).to.equal(1);
    expect(receipt2.multiHash).to.equal("blake2s-242");
    const receipt3 = await ts.getHashAlgorithmById(3);
    expect(receipt3.outputLength).to.equal(256);
    expect(receipt3.ianaName).to.equal("SHA3-256");
    expect(receipt3.oid).to.equal("oid3");
    expect(receipt3.status).to.equal(1);
    expect(receipt3.multiHash).to.equal("blake2s-252");
  });
  it("getHashAlgorithmById should revert if hash is unknown", async () => {
    await expect(ts.getHashAlgorithmById(0)).to.be.revertedWith(
      "hashAlgo unknown"
    );
  });
  it("insertHashAlgorithm should work", async () => {
    await expect(ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "blake2s-232"))
      .to.emit(ts, "AddNewHashAlgo")
      .withArgs(0, "SHA256", "SHA256", 256, "oid", 1, "blake2s-232");
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, "blake2s-232")
    )
      .to.emit(ts, "AddNewHashAlgo")
      .withArgs(1, "SHA3-512", "SHA3-512", 512, "oid2", 1, "blake2s-232");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("blake2s-232");
  });

  it("updateHashAlgorithm should revert for incorrect parameters", async () => {
    await expect(
      ts.updateHashAlgorithm(0, 0, "SHA256", "oid", 1, "blake2s-232")
    ).to.be.revertedWith("outputLength==0");
    await expect(
      ts.updateHashAlgorithm(0, 1, "SHA256", "oid", 0, "blake2s-232")
    ).to.be.revertedWith("status==0");
    await expect(
      ts.updateHashAlgorithm(0, 1, "SHA256", "oid", 1, "blake2s-232")
    ).to.be.revertedWith("hashAlgorithmId unknown");
  });
  it("updateHashAlgorithm should work", async () => {
    await expect(
      ts.insertHashAlgorithm(256, "SHA256", "oid", 1, "blake2s-232")
    ).to.emit(ts, "AddNewHashAlgo");
    await expect(
      ts.insertHashAlgorithm(512, "SHA3-512", "oid2", 1, "blake2s-232")
    ).to.emit(ts, "AddNewHashAlgo");
    const receipt = await ts.getHashAlgorithmById(1);
    expect(receipt.outputLength).to.equal(512);
    expect(receipt.ianaName).to.equal("SHA3-512");
    expect(receipt.oid).to.equal("oid2");
    expect(receipt.status).to.equal(1);
    expect(receipt.multiHash).to.equal("blake2s-232");

    await expect(
      ts.updateHashAlgorithm(1, 1024, "SHA4-1024", "oid3", 2, "blake2s-232")
    )
      .to.emit(ts, "UpdateHashAlgo")
      .withArgs(1, "SHA4-1024", "SHA4-1024", 1024, "oid3", 2, "blake2s-232");
    const updated = await ts.getHashAlgorithmById(1);
    expect(updated.outputLength).to.equal(1024);
    expect(updated.ianaName).to.equal("SHA4-1024");
    expect(updated.oid).to.equal("oid3");
    expect(updated.status).to.equal(2);
    expect(updated.multiHash).to.equal("blake2s-232");
  });

  it("getHashAlgorithms should failed with wrong page and pageSize", async () => {
    const resHashIds: number[] = [];
    for (let i = 1; i < 12; i += 1) {
      const name = `SHA-${i}`;
      const oid = `oid${i}`;
      const multiHash = `multiHash${i}`;
      // Id starts from zero
      resHashIds.push(i - 1);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(ts.insertHashAlgorithm(i, name, oid, 1, multiHash)).to.emit(
        ts,
        "AddNewHashAlgo"
      );
    }
    // pagesize = 0 should revert
    await expect(ts.getHashAlgorithms(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getHashAlgorithms(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getHashAlgorithms(1, 51)).to.be.revertedWith(
      "PSize not <=50"
    );
  });

  it("getHashAlgorithms should work with correct page and pageSize", async () => {
    const resHashIds: number[] = [];
    for (let i = 1; i < 12; i += 1) {
      const name = `SHA-${i}`;
      const oid = `oid${i}`;
      const multiHash = `multiHash${i}`;

      // Id starts from zero
      resHashIds.push(i - 1);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await expect(ts.insertHashAlgorithm(i, name, oid, 1, multiHash)).to.emit(
        ts,
        "AddNewHashAlgo"
      );
    }

    const r0 = await ts.getHashAlgorithms(1, 1);
    expect(r0.items).to.have.length(1);
    r0.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resHashIds.slice(0, 1)[id]);
    });

    expect(r0.total).to.equal(11);
    expect(r0.howMany).to.equal(1);
    expect(r0.prev).to.equal(1);
    expect(r0.next).to.equal(2);

    const r = await ts.getHashAlgorithms(1, 11);
    expect(r.items).to.have.length(11);
    r.items.forEach((el: unknown, id: number) => {
      expect(el).to.equal(resHashIds[id]);
    });
    expect(r.total).to.equal(11);
    expect(r.howMany).to.equal(11);
    expect(r.prev).to.equal(1);
    expect(r.next).to.equal(1);

    const r1 = await ts.getHashAlgorithms(5, 11);
    expect(r1.items).to.have.length(0);
    expect(r1.total).to.equal(11);
    expect(r1.howMany).to.equal(0);
    expect(r1.prev).to.equal(1);
    expect(r1.next).to.equal(1);
  });
});
