/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-apps-registry-v3/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { FactoryOptions } from "hardhat/types";
import crypto from "node:crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { Tar } from "@ebsiint-sc/trusted-apps-registry-v3";

interface User {
  wallet: ethers.Wallet;
  did: string;
}

interface AppObject {
  name: string;
  domain: number;
  appAdministrator: string;
  publicKey: string;
  status: number;
  applicationId: string;
  info: {
    [x: string]: unknown;
  };
}

interface AuthorizationObject {
  name: string;
  authorizedAppName: string;
  iss: string;
  status: number;
}

const deployContract = async (
  name: string,
  opts: FactoryOptions = {}
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.address;
};

export async function deployTarContract(): Promise<Tar> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const testDidrAddress = "0xf6080028519B49D94C846bd34e30f72586E3F5d5";

  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "PolicyRegistryMock"
  );
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(testTprAddress);
  await policyContractMock.setPolicyResult(true);

  const didRegistryFactory = await hre.ethers.getContractFactory(
    "DidRegistryMock"
  );
  const tempDidContract = await didRegistryFactory.deploy();
  await tempDidContract.deployed();
  const bytecodeDid = await hre.ethers.provider.getCode(
    tempDidContract.address
  );
  await hre.network.provider.send("hardhat_setCode", [
    testDidrAddress,
    bytecodeDid,
  ]);
  const didContractMock = didRegistryFactory.attach(testDidrAddress);
  await didContractMock.setDidResult(true);

  const paginationAddress = await deployContract("Pagination");

  const linkLibPagination = {
    libraries: {
      Pagination: paginationAddress,
    },
  };

  const tarFactory = await hre.ethers.getContractFactory("Tar", {
    libraries: {
      AppLib: await deployContract("AppLib", linkLibPagination),
      AuthLib: await deployContract("AuthLib"),
      RevocationLib: await deployContract("RevocationLib"),
    },
  });

  return tarFactory.deploy(testTprAddress, testDidrAddress);
}

export async function insertApp(contract: Tar): Promise<AppObject> {
  const name = `app-${crypto.randomBytes(8).toString("hex")}`;
  const domain = 1; // "ebsi"
  const appAdministrator = EbsiWallet.createDid();
  const publicKey = `pubkey-${crypto.randomBytes(8).toString("hex")}`;
  const applicationId = ethers.utils.sha256(ethers.utils.toUtf8Bytes(name));
  const status = 1; // "active"
  const info = {
    someNumber: Date.now(),
    someString: crypto.randomBytes(12).toString("hex"),
    someObject: {
      x: "x",
      one: 1,
    },
  };

  const bufferPublicKey = Buffer.from(publicKey, "utf8");
  const bufferInfo = Buffer.from(JSON.stringify(info), "utf8");
  await contract.insertApp(name, domain, appAdministrator);
  await contract.insertAppPublicKey(applicationId, bufferPublicKey, status);
  await contract.insertAppInfo(applicationId, bufferInfo);

  return {
    name,
    domain,
    appAdministrator,
    publicKey,
    status,
    applicationId,
    info,
  };
}

export async function insertAuthorization(
  contract: Tar,
  name: string,
  authorizedAppName: string
): Promise<AuthorizationObject> {
  const iss = EbsiWallet.createDid();
  const status = 1; // "active"
  await contract.insertAuthorization(name, authorizedAppName, iss, status);

  return {
    name,
    authorizedAppName,
    iss,
    status,
  };
}

export interface SetupOptions {
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
  appsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    appsTotal: 0,
  }
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  tarContract: Tar;
  user: User;
  apps: AppObject[];
  authorizations: [AuthorizationObject, AuthorizationObject][][];
}> {
  const ethersProvider = hre.ethers.provider;
  // Deploy contract
  const tarContract = await deployTarContract();

  // Insert fake data
  const createWallet = () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    const did = EbsiWallet.createDid();
    return { wallet, did };
  };

  const user = createWallet();

  // Create as many apps as requested
  const createApp = async () => insertApp(tarContract);

  const apps = await range(0, opts.appsTotal)
    .pipe(mergeMap(createApp), toArray())
    .toPromise();

  const authorizations = [];
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < apps.length; i += 1) {
    const authsApp = [];
    for (let j = 0; j < apps.length; j += 1) {
      const auth1 = await insertAuthorization(
        tarContract,
        apps[i].name,
        apps[j].name
      );
      const auth2 = await insertAuthorization(
        tarContract,
        apps[i].name,
        apps[j].name
      );
      authsApp.push([auth1, auth2]);
    }
    authorizations.push(authsApp);
  }
  /* eslint-enable no-await-in-loop */

  // Return test env variables
  return {
    provider: ethersProvider,
    tarContract,
    user,
    apps,
    authorizations,
  };
}
