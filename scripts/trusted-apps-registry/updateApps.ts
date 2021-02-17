import crypto from "crypto";
import { ethers } from "hardhat";
import { Tar } from "src/types/Tar";
import { getPublicKey, getPublicKeyId } from "../../utils/publicKey";

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: see ./apps.example.ts
// eslint-disable-next-line
import appDefinitions from "./apps";

interface App {
  name: string;
  domain: number;
  status: number;
  privateKeyHex?: string;
  publicKeyPem?: string;
}

function randomAddress() {
  return `0x${crypto.randomBytes(20).toString("hex")}`;
}

async function appExist(tar: Tar, app: App) {
  let publicKeyId: string;
  if (app.privateKeyHex) {
    publicKeyId = (await getPublicKey(app.privateKeyHex)).publicKeyId;
  } else if (app.publicKeyPem) {
    publicKeyId = getPublicKeyId(app.publicKeyPem);
  } else {
    throw new Error(
      `Not publicKeyPem or privateKeyHex defined for ${app.name}`
    );
  }

  const result = {
    appIdByPublicKey: "",
    appIdByName: "",
    domainByName: 0,
    nameByPublicKey: "",
  };

  // check if the public key exists and get the corresponding app Id
  try {
    const { appId } = await tar.getPublicKey(publicKeyId);
    result.appIdByPublicKey = appId;
    result.nameByPublicKey = (await tar.getAppById(appId)).name;
  } catch (error) {
    /* empty */
  }

  // check if the name exists
  try {
    const { applicationId, domain } = await tar.getAppByName(app.name);
    result.appIdByName = applicationId;
    result.domainByName = domain;
  } catch (error) {
    /* empty */
  }

  return result;
}

async function updateApp(tar: Tar, app: App) {
  let publicKeyHex: string;
  if (app.privateKeyHex) {
    publicKeyHex = (await getPublicKey(app.privateKeyHex)).publicKeyHex;
  } else if (app.publicKeyPem) {
    publicKeyHex = `0x${Buffer.from(app.publicKeyPem, "utf8").toString("hex")}`;
  } else {
    throw new Error(
      `Not publicKeyPem or privateKeyHex defined for ${app.name}`
    );
  }

  const [deployer] = await ethers.getSigners();
  const administratorId = `did:ebsi:${deployer.address}`;

  const oldApp = await appExist(tar, app);
  if (oldApp.appIdByPublicKey) {
    /* App Id derived from the public key exists
       Name or domain of this old app must be updated
     */

    const sameName = oldApp.nameByPublicKey === app.name;
    const sameDomain = oldApp.domainByName === app.domain;

    if (oldApp.appIdByName && oldApp.appIdByPublicKey !== oldApp.appIdByName) {
      /* The app name points to one app but the public key is
         pointing to another one.
       */
      console.log(
        `The public key of '${app.name}' can not be updated because it is already used by '${oldApp.nameByPublicKey}'`
      );
      return;
    }

    if (sameName && sameDomain) {
      console.log(`Nothing to update in app '${app.name}'`);
      return;
    }

    await (
      await tar.updateApp(oldApp.appIdByPublicKey, app.name, app.domain)
    ).wait(1);

    if (sameName) {
      console.log(`Domain of '${app.name}' was updated`);
    } else {
      console.log(
        `App '${oldApp.nameByPublicKey}' updated to name '${app.name}' and domain ${app.domain}`
      );
    }
    return;
  }

  if (oldApp.appIdByName) {
    /* App name exists but the public key doesn't
       Public key must be updated
     */
    await (
      await tar.insertAppPublicKey(
        oldApp.appIdByName,
        publicKeyHex,
        app.status,
        0,
        0
      )
    ).wait(1);
    console.log(`New public key inserted in '${app.name}'`);
    return;
  }

  // New App
  await (
    await tar.insertApp(
      app.name,
      app.domain,
      administratorId,
      publicKeyHex,
      app.status,
      0,
      0
    )
  ).wait(1);
  console.log(`New app '${app.name}' created`);
}

async function main() {
  // This can run only after Timestamp have been deployed with a proxy
  const [, admin] = await ethers.getSigners();

  const tarfactory = await ethers.getContractFactory("Tar", {
    signer: admin,
    libraries: {
      AdminLib: randomAddress(),
      AppLib: randomAddress(),
      AuthLib: randomAddress(),
      PolicyLib: randomAddress(),
      RevocationLib: randomAddress(),
    },
  });
  const proxyAddress = "0x4d06B562588cb61616959806726c5D9f060b0F21";
  const tar: Tar = tarfactory.attach(proxyAddress) as Tar;

  /* eslint-disable no-await-in-loop */
  // await in loop must be used to use different consecutive nonces in the transactions
  const apps = appDefinitions as App[];
  for (let i = 0; i < apps.length; i += 1) {
    await updateApp(tar, apps[i]);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
