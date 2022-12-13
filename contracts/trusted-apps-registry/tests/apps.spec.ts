import { ethers, network } from "hardhat";
import crypto from "node:crypto";
import { expect } from "chai";
import { Contract } from "ethers";
import type { FactoryOptions } from "hardhat/types";
import { Tar } from "../src/types";
import { testDidrAddress, testTprAddress } from "./testAddress";

const num = ethers.BigNumber.from;
const getAppId = (name: string) =>
  ethers.utils.sha256(ethers.utils.toUtf8Bytes(name));

function getEthObject(o: unknown): Record<string, unknown> {
  const obj = o as string[] & Record<string, unknown>;
  const keys = Object.keys(obj);
  const result: Record<string, unknown> = {};
  keys.forEach((k, i) => {
    if (i >= keys.length / 2) result[k] = obj[k];
  });
  return result;
}

function calcAuthorizationId(
  publicKeyId: string,
  authPublicKeyId: string,
  iss: string,
  status: number
) {
  return ethers.utils.sha256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "string", "uint8", "uint8", "uint256", "uint256"],
      [publicKeyId, authPublicKeyId, iss, status, "0x00", "0x00", "0x00"]
    )
  );
}

describe("Trusted Apps", () => {
  let tar: Tar;
  let policyContractMock: Contract;
  let didContractMock: Contract;

  const randomData = crypto.randomBytes(32);
  const randomData2 = crypto.randomBytes(32);
  const randomData3 = crypto.randomBytes(32);

  const app = {
    name: "my-app",
    id: getAppId("my-app"),
    publicKeyId: ethers.utils.sha256(randomData),
    publicKey: `0x${randomData.toString("hex")}`,
    admin: "did:ebsi:admin-my-app",
  };

  const app2 = {
    name: "my-app2",
    id: getAppId("my-app2"),
    publicKeyId: ethers.utils.sha256(randomData2),
    publicKey: `0x${randomData2.toString("hex")}`,
    admin: "did:ebsi:admin-my-app2",
  };

  const authApp = {
    name: "my-app3",
    id: getAppId("my-app3"),
    publicKeyId: ethers.utils.sha256(randomData3),
    publicKey: `0x${randomData3.toString("hex")}`,
    admin: "did:ebsi:admin-my-app3",
  };

  let firstAuthId: string;

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistryMock"
    );
    const tempPolicyContract = await policyRegistryFactory.deploy();
    await tempPolicyContract.deployed();
    const bytecodeTpr = await ethers.provider.getCode(
      tempPolicyContract.address
    );
    await network.provider.send("hardhat_setCode", [
      testTprAddress,
      bytecodeTpr,
    ]);
    policyContractMock = policyRegistryFactory.attach(testTprAddress);
    await policyContractMock.setPolicyResult(true);

    const didRegistryFactory = await ethers.getContractFactory(
      "DidRegistryMock"
    );
    const tempDidContract = await didRegistryFactory.deploy();
    await tempDidContract.deployed();
    const bytecodeDid = await ethers.provider.getCode(tempDidContract.address);
    await network.provider.send("hardhat_setCode", [
      testDidrAddress,
      bytecodeDid,
    ]);
    didContractMock = didRegistryFactory.attach(testDidrAddress);
    await didContractMock.setDidResult(true);
  });

  beforeEach(async () => {
    const deployContract = async (
      name: string,
      opts: FactoryOptions = {}
    ): Promise<string> => {
      const factory = await ethers.getContractFactory(name, opts);
      const contract = await factory.deploy();
      return contract.address;
    };
    const Pagination = await deployContract("Pagination");
    const contractFactory = await ethers.getContractFactory("Tar", {
      libraries: {
        AppLib: await deployContract("AppLib", {
          libraries: { Pagination },
        }),
        TarPolicyLib: await deployContract("TarPolicyLib", {
          libraries: { Pagination },
        }),
        RevocationLib: await deployContract("RevocationLib"),
        AuthLib: await deployContract("AuthLib"),
      },
    });

    tar = (await contractFactory.deploy(
      testTprAddress,
      testDidrAddress
    )) as Tar;
    await tar.initialize(42);
    await tar.setRegistryAddresses();
    const initialVersion = await tar.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(tar.address).to.properAddress;

    await policyContractMock.setPolicyResult(true);
    await didContractMock.setDidResult(true);

    // insert apps
    await tar.insertApp(app.name, 1, app.admin);
    await tar.insertApp(app2.name, 1, app2.admin);
    await tar.insertApp(authApp.name, 1, authApp.admin);

    // insert public keys
    await tar.insertAppPublicKey(app.id, app.publicKey, 1, 0, 0);
    await tar.insertAppPublicKey(app2.id, app2.publicKey, 1, 0, 0);
    await tar.insertAppPublicKey(authApp.id, authApp.publicKey, 1, 0, 0);

    // authApp is authorized to use app
    await tar.insertAuthorization(
      app.name,
      authApp.name,
      app.admin,
      1,
      0,
      0,
      0
    );
    firstAuthId = calcAuthorizationId(
      getAppId(app.name),
      getAppId(authApp.name),
      app.admin,
      1
    );
  });

  it("should reject no authenticated users", async () => {
    await policyContractMock.setPolicyResult(false);
    await didContractMock.setDidResult(false);

    // reject new apps
    await expect(tar.insertApp("new-app", 1, "did:me")).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TAR:insertApp"
    );

    // reject revocations
    await expect(
      tar.insertRevocation(app.id, "did:ebsi:me", 0)
    ).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TAR:insertRevocation"
    );
    await policyContractMock.setPolicyResult(true);
    await expect(
      tar.insertRevocation(app.id, "did:ebsi:me", 0)
    ).to.be.revertedWith(
      "Policy error: sender is not controller of the did did:ebsi:me"
    );
    await policyContractMock.setPolicyResult(false);

    // reject changes in existing apps
    await expect(tar.updateApp(app.id, 1)).to.be.revertedWith(
      "Policy error: sender doesn't have the attribute TAR:updateApp"
    );

    await expect(tar.insertAppInfo(app.id, randomData)).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:insertAppInfo",
      ].join("")
    );

    await expect(
      tar.insertAuthorization(app.name, app2.name, app.admin, 1, 1, 0, 0)
    ).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:insertAuthorization",
      ].join("")
    );

    await policyContractMock.setPolicyResult(true);
    await expect(
      tar.insertAuthorization(app.name, app2.name, "randomdid", 1, 1, 0, 0)
    ).to.be.revertedWith(
      "Policy error: sender is not controller of the did randomdid"
    );
    await policyContractMock.setPolicyResult(false);

    await expect(
      tar.updateAuthorization(firstAuthId, 2, 2, 0)
    ).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:updateAuthorization",
      ].join("")
    );

    await expect(
      tar.insertAppPublicKey(app.id, crypto.randomBytes(32), 1, 0, 0)
    ).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:insertAppPublicKey",
      ].join("")
    );

    await expect(
      tar.updateAppPublicKey(app.publicKeyId, 1, 0)
    ).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:updateAppPublicKey",
      ].join("")
    );

    await expect(
      tar.insertAppAdministrator(app.id, "did:newadmin")
    ).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:insertAppAdministrator",
      ].join("")
    );

    await expect(
      tar.deleteAppAdministrator(app.id, app.admin)
    ).to.be.revertedWith(
      [
        "Policy error: sender is not controller of any of the ",
        "adminitrators of app 'my-app' and it doesn't have ",
        "the attribute TAR:deleteAppAdministrator",
      ].join("")
    );
  });

  it("should insert/revoke apps", async () => {
    const data = crypto.randomBytes(40);
    const newApp = {
      name: "new-app",
      id: getAppId("new-app"),
      publicKeyId: ethers.utils.sha256(data),
      publicKey: `0x${data.toString("hex")}`,
      admin: "did:ebsi:admin-my-app",
    };

    await expect(tar.insertApp(newApp.name, 1, newApp.admin)).to.emit(
      tar,
      "ApplicationRegistered"
    );

    await expect(tar.insertRevocation(newApp.id, "did:me", 0)).to.emit(
      tar,
      "AddNewRevocation"
    );

    const revocation = await tar.getRevocation(newApp.id);
    expect(getEthObject(revocation)).to.eql({
      revokedBy: "did:me",
      notBefore: num(0),
    });
  });

  it("should revert if no new data", async () => {
    await policyContractMock.setPolicyResult(false);

    const info = crypto.randomBytes(32);
    await expect(tar.insertAppInfo(app.id, info)).to.emit(
      tar,
      "ApplicationInfoUpdated"
    );

    const extraPubKey = crypto.randomBytes(40);
    const extraPubKeyId = ethers.utils.sha256(extraPubKey);
    await expect(tar.insertAppPublicKey(app.id, extraPubKey, 0, 0, 0)).to.emit(
      tar,
      "PublicKeyAdded"
    );

    await expect(tar.updateAppPublicKey(extraPubKeyId, 0, 0)).to.revertedWith(
      "No new data for update"
    );
  });

  it("should update info/publickeys of the app by app admin", async () => {
    await policyContractMock.setPolicyResult(false);

    const info = crypto.randomBytes(32);
    const infoId = ethers.utils.sha256(info);
    await expect(tar.insertAppInfo(app.id, info)).to.emit(
      tar,
      "ApplicationInfoUpdated"
    );

    const extraPubKey = crypto.randomBytes(40);
    const extraPubKeyId = ethers.utils.sha256(extraPubKey);
    await expect(tar.insertAppPublicKey(app.id, extraPubKey, 0, 0, 0)).to.emit(
      tar,
      "PublicKeyAdded"
    );

    await expect(tar.updateAppPublicKey(extraPubKeyId, 1, 0)).to.emit(
      tar,
      "PublicKeyUpdated"
    );

    const infoResult = await tar.getAppInfoByInfoId(infoId);
    expect(infoResult).to.eql(`0x${info.toString("hex")}`);

    const infos = await tar.getAppInfoIds(app.id, 1, 50);
    expect(getEthObject(infos)).to.eql({
      items: [infoId],
      total: num(1),
      howMany: num(1),
      prev: num(1),
      next: num(1),
    });

    const pubKeyIds = await tar.getAppPublicKeyIds(app.id, 1, 50);
    expect(getEthObject(pubKeyIds)).to.eql({
      items: [app.publicKeyId, extraPubKeyId],
      total: num(2),
      howMany: num(2),
      prev: num(1),
      next: num(1),
    });

    const appById = await tar.getAppById(app.id);
    expect(getEthObject(appById)).to.eql({
      name: app.name,
      domain: 1,
    });

    const appInfo = await tar.getAppInfo(app.id);
    expect(appInfo).to.eql(infoResult);

    const resultAppByPublicKey = await tar.getAppByPublicKeyId(app.publicKeyId);
    expect(getEthObject(resultAppByPublicKey)).to.eql({
      applicationId: app.id,
      name: app.name,
      domain: 1,
    });

    const resultApps = await tar.getApps(1, 50);
    expect(getEthObject(resultApps)).to.eql({
      items: [app.id, app2.id, authApp.id],
      total: num(3),
      howMany: num(3),
      prev: num(1),
      next: num(1),
    });

    const resultPubKey = await tar.getPublicKey(extraPubKeyId);
    expect(getEthObject(resultPubKey)).to.eql({
      appId: app.id,
      publicKey: `0x${extraPubKey.toString("hex")}`,
      status: 1,
      notBefore: num(0),
      notAfter: num(0),
    });
  });

  it("should update appAdmins of an app by app admin", async () => {
    await policyContractMock.setPolicyResult(false);
    await expect(tar.insertAppAdministrator(app.id, "did:newadmin")).to.emit(
      tar,
      "ApplicationAdministratorAdded"
    );

    let resultAppAdmins = await tar.getAppAdministratorIds(app.id, 1, 50);
    expect(getEthObject(resultAppAdmins)).to.eql({
      items: [app.admin, "did:newadmin"],
      total: num(2),
      howMany: num(2),
      prev: num(1),
      next: num(1),
    });

    await expect(tar.deleteAppAdministrator(app.id, app.admin)).to.emit(
      tar,
      "ApplicationAdministratorDeleted"
    );

    resultAppAdmins = await tar.getAppAdministratorIds(app.id, 1, 50);
    expect(getEthObject(resultAppAdmins)).to.eql({
      items: ["did:newadmin"],
      total: num(1),
      howMany: num(1),
      prev: num(1),
      next: num(1),
    });

    await expect(tar.deleteAppAdministrator(app.id, "did:newadmin")).to.emit(
      tar,
      "ApplicationAdministratorDeleted"
    );

    resultAppAdmins = await tar.getAppAdministratorIds(app.id, 1, 50);
    expect(getEthObject(resultAppAdmins)).to.eql({
      items: [],
      total: num(0),
      howMany: num(0),
      prev: num(1),
      next: num(1),
    });
  });

  it("should revert if update has no new data", async () => {
    await policyContractMock.setPolicyResult(false);
    await expect(
      tar.insertAuthorization(app.name, app2.name, "did:me", 0, 0, 0, 0)
    ).to.emit(tar, "AddNewAuthorization");
    const authId = calcAuthorizationId(
      getAppId(app.name),
      getAppId(app2.name),
      "did:me",
      0
    );
    await expect(tar.updateAuthorization(authId, 0, 0, 0)).to.revertedWith(
      "No new data for update"
    );
  });

  it("should insert/update authorizations by app admin", async () => {
    await policyContractMock.setPolicyResult(false);
    await expect(
      tar.insertAuthorization(app.name, app2.name, "did:me", 0, 0, 0, 0)
    ).to.emit(tar, "AddNewAuthorization");
    const authId = calcAuthorizationId(
      getAppId(app.name),
      getAppId(app2.name),
      "did:me",
      0
    );
    await expect(tar.updateAuthorization(authId, 1, 0, 0)).to.emit(
      tar,
      "UpdateAuthorization"
    );

    let auths = await tar.getAuthorizations(app.id, app2.id, 1, 50);
    expect(getEthObject(auths)).to.eql({
      items: [authId],
      total: num(1),
      howMany: num(1),
      prev: num(1),
      next: num(1),
    });

    auths = await tar.getAuthorizedAppsIds(app.id, 1, 50);
    expect(getEthObject(auths)).to.eql({
      items: [authApp.id, app2.id],
      total: num(2),
      howMany: num(2),
      prev: num(1),
      next: num(1),
    });

    const auth = await tar.getAuthorizationById(authId);
    expect(getEthObject(auth)).to.eql({
      applicationId: app.id,
      authorizedAppId: app2.id,
      name: app.name,
      authorizedAppName: app2.name,
      iss: "did:me",
      status: 1,
      permissions: 0,
      notBefore: num(0),
      notAfter: num(0),
    });
  });
});
