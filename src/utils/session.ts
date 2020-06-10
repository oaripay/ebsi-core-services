import EBSI_JWT from "@cef-ebsi/app-jwt";
import { ethers } from "ethers";
import * as config from "../config";

const getComponentPrivateKey = async () => {
  const wallet: ethers.Wallet = await ethers.Wallet.fromEncryptedJson(
    config.COMPONENT_KEYSTORE,
    config.COMPONENT_PASSWORD
  );
  return wallet.privateKey;
};

const getSession = async () => {
  const session = new EBSI_JWT.Session(
    config.API_NAME,
    await getComponentPrivateKey(),
    config.EBSI_SERVICE.URL.TRUSTED_APPS_REGISTRY
  );
  return session;
};

const getSessionRequestBody = async (targetApp: string) => {
  const agent = new EBSI_JWT.Agent(
    config.API_NAME,
    await getComponentPrivateKey(),
    config.EBSI_SERVICE.URL.TRUSTED_APPS_REGISTRY
  );
  const request = agent.newRequest(targetApp);
  return request;
};

export { getSession, getSessionRequestBody };
