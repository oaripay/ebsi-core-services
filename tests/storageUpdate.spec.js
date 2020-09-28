const {
  BN, // Big Number support
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");

const {accounts, contract, web3} = require("@openzeppelin/test-environment");

const Tir = contract.fromArtifact("Tir");
const TirV1 = contract.fromArtifact("TirV1");
const TirV2 = contract.fromArtifact("TirV2");
const TirV2Breaking = contract.fromArtifact("TirV2Breaking");
const encodeCall = require("./helpers/encodeCall");

const OwnedUpgradeabilityProxy = contract.fromArtifact(
  "OwnedUpgradeabilityProxy"
);
const initializeData = (issuerOperator, anchorOwner) =>
  encodeCall(
    "initialize",
    [
      {
        type: "uint256",
        name: "version",
      },
      {
        type: "address",
        name: "operator",
      },
      {
        type: "address[]",
        name: "pausers",
      },
    ],
    ["1", issuerOperator, [anchorOwner]]
  );

const setupProxy = async (initializeDataString, proxyOwner, proxyAdmin) => {
  const proxy = await OwnedUpgradeabilityProxy.new({
    from: proxyOwner,
  });
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
    issuer: tir,
    issuerV1: tirV1,
    implV2,
    tirV2,
    implV2Breaking,
    tirV2Breaking,
  };
};

describe("upgrade and call new version struct", () => {
  it("works when new parameters has been added at the end of the struct", async () => {
    expect.assertions(13);
    const [
      proxyOwner,
      issuerOperator,
      proxyAdmin,
      anotherAccount,
      anchorOwner,
    ] = accounts;
    const {proxy, issuer, issuerV1, implV1, implV2, tirV2} = await setupProxy(
      initializeData(issuerOperator, anchorOwner),
      proxyOwner,
      proxyAdmin,
      issuerOperator,
      anchorOwner
    );

    const adm = await proxy.admin.call({
      from: proxyAdmin,
    });
    expect(adm).toStrictEqual(proxyAdmin);
    const v0 = await issuer.version.call({from: anotherAccount});
    const v1 = await issuerV1.version.call({from: anotherAccount});

    expect(v0).toStrictEqual(v1);

    await proxy.upgradeTo(implV1.address, {from: proxyAdmin});

    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = web3.utils.sha3(did);
    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
    const receipt = await issuer.insertIssuer(did, inputdata, {
      from: anotherAccount,
    });

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = web3.utils.sha3(data);

    expectEvent(receipt, "addIssuerAttribute", {
      didHash,
      firstAttrHash,
      did,
      attributeVersionCount: new BN(1),
      attributesCount: new BN(1),
    });
    const didAttributes = await issuerV1.getIssuerAttributesFirstHash(did, {
      from: anotherAccount,
    });
    expect(didAttributes[0]).toStrictEqual(firstAttrHash);

    const attributeVersions = await issuerV1.getIssuerAttributeHistory(
      firstAttrHash,
      {
        from: anotherAccount,
      }
    );
    expect(attributeVersions[0]).toStrictEqual(firstAttrHash);

    const didFromAttrHash = await issuerV1.getIssuerDid(firstAttrHash, {
      from: anotherAccount,
    });
    expect(didFromAttrHash).toStrictEqual(did);

    await proxy.upgradeTo(implV2.address, {from: proxyAdmin});
    await tirV2.setMessage("1", {
      from: anotherAccount,
    });
    const count = await tirV2.getMessage.call({
      from: anotherAccount,
    });
    expect(count.toString()).toStrictEqual("1");
    await issuer.insertIssuer(
      "did2",
      web3.utils.hexToBytes(web3.utils.toHex("inputdata2")),
      {
        from: anotherAccount,
      }
    );
    await issuer.insertIssuer(
      "did3",
      web3.utils.hexToBytes(web3.utils.toHex("inputdata3")),
      {
        from: anotherAccount,
      }
    );
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

    const didAttributes2 = await tirV2.getIssuerAttributesFirstHash2(did, {
      from: anotherAccount,
    });

    expect(didAttributes2[0]).toStrictEqual(firstAttrHash);
    expect(count2.toString()).toStrictEqual("7");
    const didAttributes0 = await tirV2.getIssuerAttributesFirstHash(did, {
      from: anotherAccount,
    });
    expect(didAttributes0[0]).toStrictEqual(firstAttrHash);
    const did2firstAttrHash = web3.utils.sha3("inputdata2");
    const did2Attributes0 = await tirV2.getIssuerAttributesFirstHash("did2", {
      from: anotherAccount,
    });
    const did2Attributes0v2 = await tirV2.getIssuerAttributesFirstHash2(
      "did2",
      {
        from: anotherAccount,
      }
    );
    expect(did2Attributes0[0]).toStrictEqual(did2firstAttrHash);
    expect(did2Attributes0v2[0]).toStrictEqual(did2firstAttrHash);
    const attributeVersions0 = await tirV2.getIssuerAttributeHistory(
      firstAttrHash,
      {
        from: anotherAccount,
      }
    );

    expect(attributeVersions0[0]).toStrictEqual(firstAttrHash);
    const didFromAttrHash0 = await tirV2.getIssuerDid(firstAttrHash, {
      from: anotherAccount,
    });
    expect(didFromAttrHash0).toStrictEqual(did);
  });
  it("fails when new parameters has been added in the middle of the struct", async () => {
    expect.assertions(5);
    const [
      proxyOwner,
      issuerOperator,
      proxyAdmin,
      anotherAccount,
      anchorOwner,
    ] = accounts;
    const {
      proxy,
      issuer,
      issuerV1,
      implV1,
      implV2Breaking,
      tirV2Breaking,
    } = await setupProxy(
      initializeData(issuerOperator, anchorOwner),
      proxyOwner,
      proxyAdmin,
      issuerOperator,
      anchorOwner
    );

    const adm = await proxy.admin.call({
      from: proxyAdmin,
    });
    expect(adm).toStrictEqual(proxyAdmin);
    const v0 = await issuer.version.call({from: anotherAccount});
    const v1 = await issuerV1.version.call({from: anotherAccount});

    expect(v0).toStrictEqual(v1);

    await proxy.upgradeTo(implV1.address, {from: proxyAdmin});

    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = web3.utils.sha3(did);
    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
    const receipt = await issuer.insertIssuer(did, inputdata, {
      from: anotherAccount,
    });

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = web3.utils.sha3(data);

    expectEvent(receipt, "addIssuerAttribute", {
      didHash,
      firstAttrHash,
      did,
      attributeVersionCount: new BN(1),
      attributesCount: new BN(1),
    });
    const didAttributes = await issuerV1.getIssuerAttributesFirstHash(did, {
      from: anotherAccount,
    });

    expect(didAttributes[0]).toStrictEqual(firstAttrHash);

    await proxy.upgradeTo(implV2Breaking.address, {from: proxyAdmin});
    const message = `incredibillylongmesagmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggesylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesaggeincredibilylongmesagges`;
    await tirV2Breaking.setMessage(message, {
      from: anotherAccount,
    });
    const msg = await tirV2Breaking.getMessage.call({
      from: anotherAccount,
    });
    expect(msg).toStrictEqual(message);
    const didAttributes2 = await tirV2Breaking.getIssuerAttributesFirstHash2(
      did,
      {
        from: anotherAccount,
      }
    );

    expect(didAttributes2[0]).toBeUndefined();
  });
});
