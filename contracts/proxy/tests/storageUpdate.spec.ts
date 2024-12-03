import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { assert, expect } from "chai";
import { ethers } from "hardhat";

const initializeData = async (pauser: SignerWithAddress) => {
  const tirFactory = await ethers.getContractFactory("Tir");
  return tirFactory.interface.encodeFunctionData(
    "initialize(uint256,address[])",
    ["1", [pauser.address]],
  );
};

const setupProxy = async (
  initializeDataString: string,
  proxyOwner: SignerWithAddress,
  proxyAdmin: SignerWithAddress,
) => {
  const proxyFactory = await ethers.getContractFactory(
    "OwnedUpgradeabilityProxy",
  );
  const proxy = await proxyFactory.connect(proxyOwner).deploy();
  await proxy.deployed();

  const implV0 = await (await ethers.getContractFactory("Tir")).deploy();
  const implV1 = await (await ethers.getContractFactory("TirV1")).deploy();
  const implV2 = await (await ethers.getContractFactory("TirV2")).deploy();
  const implV2Breaking = await (
    await ethers.getContractFactory("TirV2Breaking")
  ).deploy();

  const tir = (await ethers.getContractFactory("Tir")).attach(proxy.address);
  const tirV1 = (await ethers.getContractFactory("TirV1")).attach(
    proxy.address,
  );
  const tirV2 = (await ethers.getContractFactory("TirV2")).attach(
    proxy.address,
  );
  const tirV2Breaking = (
    await ethers.getContractFactory("TirV2Breaking")
  ).attach(proxy.address);

  await proxy["initialize(address,address,bytes)"](
    implV0.address,
    proxyAdmin.address,
    initializeDataString,
  );

  return {
    implV0,
    implV1,
    implV2,
    implV2Breaking,
    proxy,
    tir,
    tirV1,
    tirV2,
    tirV2Breaking,
  };
};

describe("upgrade and call new version struct", () => {
  it("works when new parameters has been added at the end of the struct", async () => {
    const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
      await ethers.getSigners();

    const { implV1, implV2, proxy, tir, tirV1, tirV2 } = await setupProxy(
      await initializeData(anchorOwner),
      proxyOwner,
      proxyAdmin,
    );

    const adm = await proxy.connect(proxyAdmin).callStatic.admin();

    assert.equal(adm, proxyAdmin.address);

    const v0 = await tir.version.call({ from: anotherAccount });
    const v1 = await tirV1.version.call({ from: anotherAccount });

    assert.deepStrictEqual(v0, v1);

    await proxy.connect(proxyAdmin).upgradeTo(implV1.address);

    const did = "did";

    await tir.connect(anotherAccount).pushDid(did);

    const dids = await tirV1.connect(anotherAccount).getDids();
    assert.deepStrictEqual(dids, ["did"]);

    await proxy.connect(proxyAdmin).upgradeTo(implV2.address);
    await tirV2.connect(anotherAccount).setMessage("1");
    await tirV2.connect(anotherAccount).getMessage();
    await tir.connect(anotherAccount).pushDid("did2");
    await tir.connect(anotherAccount).pushDid("did3");
    await tirV2.connect(anotherAccount).setMessage("2");
    await tirV2.connect(anotherAccount).setMessage("3");
    await tirV2.connect(anotherAccount).setMessage("4");
    await tirV2.connect(anotherAccount).setMessage("5");
    await tirV2.connect(anotherAccount).setMessage("6");
    await tirV2.connect(anotherAccount).setMessage("7");

    const count2 = await tirV2.connect(anotherAccount).getMessage();
    const dids2 = await tirV2.connect(anotherAccount).getDids2();

    assert.deepStrictEqual(dids2, ["did", "did2", "did3"]);
    assert.equal(count2.toString(), "7");

    await tirV2.connect(anotherAccount).pushDid("newDid");

    const newDids = await tirV2.connect(anotherAccount).getDids2();
    assert.deepStrictEqual(newDids, ["did", "did2", "did3", "newDid"]);
  });

  it("fails when new parameters has been added in the middle of the struct", async () => {
    const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
      await ethers.getSigners();
    const { implV1, implV2Breaking, proxy, tir, tirV1, tirV2Breaking } =
      await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
      );

    const adm = await proxy.connect(proxyAdmin).callStatic.admin();

    assert.equal(adm, proxyAdmin.address);

    const v0 = await tir.version.call({ from: anotherAccount });
    const v1 = await tirV1.version.call({ from: anotherAccount });

    assert.deepStrictEqual(v0, v1);

    await proxy.connect(proxyAdmin).upgradeTo(implV1.address);

    const did = "did";
    await tir.connect(anotherAccount).pushDid(did);

    const firstDid = await tirV1.connect(anotherAccount).getDids();
    assert.deepStrictEqual(firstDid, ["did"]);

    await proxy.connect(proxyAdmin).upgradeTo(implV2Breaking.address);

    const message = `incredibillylongmesagmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesagges`;
    await proxy.connect(proxyAdmin).implementation();

    await expect(tirV2Breaking.connect(anotherAccount).setMessage(message)).to
      .be.reverted;
    await expect(tirV2Breaking.connect(anotherAccount).getMessage()).to.be
      .reverted;

    const dids2 = await tirV2Breaking.connect(anotherAccount).getDids2();
    assert.deepStrictEqual(dids2, []);
    await tirV2Breaking.connect(anotherAccount).pushDid2("did2");
    const secondDid = await tirV1.connect(anotherAccount).getDids();
    assert.deepStrictEqual(firstDid, secondDid);
  });
});
