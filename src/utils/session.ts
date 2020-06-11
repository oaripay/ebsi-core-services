import EBSI_JWT from "@cef-ebsi/app-jwt";
import * as config from "../config";

const getSession = async () => {
  const session = new EBSI_JWT.Session(
    config.API_NAME,
    config.API_PRIVATE_KEY,
    config.EBSI_SERVICE.URL.TRUSTED_APPS_REGISTRY
  );
  return session;
};

const getSessionRequestBody = async (targetApp: string) => {
  const agent = new EBSI_JWT.Agent(
    config.API_NAME,
    config.API_PRIVATE_KEY,
    config.EBSI_SERVICE.URL.TRUSTED_APPS_REGISTRY
  );
  const request = agent.newRequest(targetApp);
  return request;
};

export { getSession, getSessionRequestBody };
