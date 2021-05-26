import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {DidRegistry, Tar, Tir} from "../src/types";
import {ethers} from "hardhat";


// follows ETH/BTC's BIP 39 protocol
// https://iancoleman.io/bip39/
// and matches the one hardhat uses when using { accounts: { mnemonic }}
task("fixTarStatus", "Update tar statuses for apps ", async (taskArgs: {proxy: string, app: string, auth: string}, {ethers}) => {

  const [deployer, admin] = await ethers.getSigners();
  const ts: Tar = (await ethers.getContractAt("Tar", taskArgs.proxy, admin)) as Tar;

  console.log(
    `deployer:${deployer.address}
     admin:${admin.address}`
  );
  const initialVersion = await ts.version();
  console.log(initialVersion);
  console.log("initialVersion:", initialVersion.toString());

  // get app Id

  let appId = await ts.getAppByName(taskArgs.app);
  console.log('app id ', appId);
  let authAppIds = [];

  if (taskArgs.auth || taskArgs.auth !== "all" ) {
    let auth = taskArgs.auth.split(",");
    for (let appName of auth) {
      authAppIds.push((await ts.getAppByName(appName)).applicationId);
    }
  } else {
    authAppIds = (await ts.getAuthorizedAppsIds(appId.applicationId, 1, 50)).items;
  }

  console.log('authorizations ', authAppIds);

  for (let authAppId of authAppIds) {
    console.log("processing auth :", authAppId);
    // get auth
    try {
      let authorizations = await ts.getAuthorizations(appId.applicationId, authAppId, 1, 50);
      console.log("Authorizations: ", authorizations);
      for (let auth of authorizations.items) {
        let contractAuth = await ts.getAuthorizationById(auth);
        // console.log("contract auth :", contractAuth);
        if (contractAuth.status == 0) {
          // status needs to be moved to 1
          await (await ts.updateAuthorization(auth, 1, contractAuth.permissions, contractAuth.notAfter)).wait(1);
          console.log("auth updated: ", auth);
        }

      }

    } catch (e) {
      console.log('error on getting auth');
    }

  }






})
  .addParam("proxy", "Proxy Address")
  .addParam("app", "The application which status needs to be updated")
  .addOptionalParam("auth", "List of authorizations comma delimited, default all apps from the current one");
