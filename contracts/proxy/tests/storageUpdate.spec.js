const { describe, it, expect } = require("@jest/globals");
const {
  expectRevert, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const { accounts, contract } = require("@openzeppelin/test-environment");
const PaginationArtifact = require("@ebsiint-sc/bootstrap/artifacts/contracts/utils/Pagination.sol/Pagination.json");

const Pagination = contract.fromABI(
  PaginationArtifact.abi,
  PaginationArtifact.bytecode
);

contract.artifactsDir = "artifacts/contracts/test/tir/Tir.sol";
const Tir = contract.fromArtifact("Tir");

contract.artifactsDir = "artifacts/contracts/test/TirV1.sol";
const TirV1 = contract.fromArtifact("TirV1");

contract.artifactsDir = "artifacts/contracts/test/TirV2.sol";
const TirV2 = contract.fromArtifact("TirV2");

contract.artifactsDir = "artifacts/contracts/test/TirV2Breaking.sol";
const TirV2Breaking = contract.fromArtifact("TirV2Breaking");

const encodeCall = require("./helpers/encodeCall");

contract.artifactsDir =
  "artifacts/contracts/upgradeability/OwnedUpgradeabilityProxy.sol";
const OwnedUpgradeabilityProxy = contract.fromArtifact(
  "OwnedUpgradeabilityProxy"
);

const initializeData = (pauser) =>
  encodeCall(
    "initialize",
    [
      {
        type: "uint256",
        name: "version",
      },
      {
        type: "address[]",
        name: "pausers",
      },
    ],
    ["1", [pauser]]
  );

const setupProxy = async (initializeDataString, proxyOwner, proxyAdmin) => {
  const proxy = await OwnedUpgradeabilityProxy.new({
    from: proxyOwner,
  });
  const myLibrary = await Pagination.new();
  await Tir.detectNetwork();
  await Tir.link("Pagination", myLibrary.address);
  await TirV1.detectNetwork();
  await TirV1.link("Pagination", myLibrary.address);
  await TirV2.detectNetwork();
  await TirV2.link("Pagination", myLibrary.address);
  await TirV2Breaking.detectNetwork();
  await TirV2Breaking.link("Pagination", myLibrary.address);
  const implV0 = await Tir.new();
  const implV1 = await TirV1.new();
  const implV2 = await TirV2.new();
  const implV2Breaking = await TirV2Breaking.new();
  const tir = await Tir.at(proxy.address);
  const tirV1 = await TirV1.at(proxy.address);
  const tirV2 = await TirV2.at(proxy.address);
  const tirV2Breaking = await TirV2Breaking.at(proxy.address);
  await proxy.initialize(implV0.address, proxyAdmin, initializeDataString, {
    from: proxyOwner,
  });
  return {
    proxy,
    implV0,
    implV1,
    tir,
    tirV1,
    implV2,
    tirV2,
    implV2Breaking,
    tirV2Breaking,
  };
};

describe("upgrade and call new version struct", () => {
  it("works when new parameters has been added at the end of the struct", async () => {
    expect.assertions(6);
    const [proxyOwner, tirOperator, proxyAdmin, anotherAccount, anchorOwner] =
      accounts;
    const { proxy, tir, tirV1, implV1, implV2, tirV2 } = await setupProxy(
      initializeData(anchorOwner),
      proxyOwner,
      proxyAdmin,
      tirOperator,
      anchorOwner
    );

    const adm = await proxy.admin.call({
      from: proxyAdmin,
    });
    expect(adm).toStrictEqual(proxyAdmin);
    const v0 = await tir.version.call({ from: anotherAccount });
    const v1 = await tirV1.version.call({ from: anotherAccount });

    expect(v0).toStrictEqual(v1);

    await proxy.upgradeTo(implV1.address, { from: proxyAdmin });

    const did = "did";
    await tir.pushDid(did, {
      from: anotherAccount,
    });

    const dids = await tirV1.getDids({
      from: anotherAccount,
    });
    expect(dids).toStrictEqual(["did"]);

    await proxy.upgradeTo(implV2.address, { from: proxyAdmin });
    await tirV2.setMessage("1", {
      from: anotherAccount,
    });

    await tirV2.getMessage.call({
      from: anotherAccount,
    });

    await tir.pushDid("did2", {
      from: anotherAccount,
    });
    await tir.pushDid("did3", {
      from: anotherAccount,
    });
    await tirV2.setMessage("2", {
      from: anotherAccount,
    });
    await tirV2.setMessage("3", {
      from: anotherAccount,
    });
    await tirV2.setMessage("4", {
      from: anotherAccount,
    });
    await tirV2.setMessage("5", {
      from: anotherAccount,
    });
    await tirV2.setMessage("6", {
      from: anotherAccount,
    });
    await tirV2.setMessage("7", {
      from: anotherAccount,
    });

    const count2 = await tirV2.getMessage({
      from: anotherAccount,
    });

    const dids2 = await tirV2.getDids2({
      from: anotherAccount,
    });

    expect(dids2).toStrictEqual(["did", "did2", "did3"]);
    expect(count2.toString()).toBe("7");
    await tirV2.pushDid("newDid", {
      from: anotherAccount,
    });
    const newdids = await tirV2.getDids2({
      from: anotherAccount,
    });
    expect(newdids).toStrictEqual(["did", "did2", "did3", "newDid"]);
  });
  it("fails when new parameters has been added in the middle of the struct", async () => {
    expect.assertions(5);
    const [proxyOwner, tirOperator, proxyAdmin, anotherAccount, anchorOwner] =
      accounts;
    const { proxy, tir, tirV1, implV1, implV2Breaking, tirV2Breaking } =
      await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );

    const adm = await proxy.admin.call({
      from: proxyAdmin,
    });
    expect(adm).toStrictEqual(proxyAdmin);
    const v0 = await tir.version.call({ from: anotherAccount });

    const v1 = await tirV1.version.call({ from: anotherAccount });
    expect(v0).toStrictEqual(v1);

    await proxy.upgradeTo(implV1.address, { from: proxyAdmin });

    const did = "did";

    await tir.pushDid(did, {
      from: anotherAccount,
    });
    const firstDid = await tirV1.getDids({
      from: anotherAccount,
    });
    expect(firstDid).toStrictEqual(["did"]);

    await proxy.upgradeTo(implV2Breaking.address, {
      from: proxyAdmin,
    });
    const message = `incredibillylongmesagmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesagges`;
    await proxy.implementation({ from: proxyAdmin });

    await expectRevert.unspecified(
      tirV2Breaking.setMessage(message, {
        from: anotherAccount,
      })
    );
    await expectRevert.unspecified(
      tirV2Breaking.getMessage.call({
        from: anotherAccount,
      })
    );
    const dids2 = await tirV2Breaking.getDids2({
      from: anotherAccount,
    });
    expect(dids2).toStrictEqual([]);
    await tirV2Breaking.pushDid2("did2", {
      from: anotherAccount,
    });
    const secondDid = await tirV1.getDids({
      from: anotherAccount,
    });
    expect(firstDid).toStrictEqual(secondDid);
  });
});
