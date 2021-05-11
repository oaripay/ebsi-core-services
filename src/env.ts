const { REACT_APP_EBSI_ENV, PUBLIC_URL, REACT_APP_CAPTCHA_KEY } = process.env;

if (!REACT_APP_EBSI_ENV) {
  throw new Error("REACT_APP_EBSI_ENV must be defined");
}

if (!["local", "test", "pilot", "prod"].includes(REACT_APP_EBSI_ENV)) {
  throw new Error(
    `REACT_APP_EBSI_ENV has an unknown value: ${REACT_APP_EBSI_ENV}`
  );
}

if (!PUBLIC_URL && PUBLIC_URL !== "") {
  throw new Error("PUBLIC_URL must be defined");
}
if (!REACT_APP_CAPTCHA_KEY && REACT_APP_CAPTCHA_KEY !== "") {
  throw new Error("REACT_APP_CAPTCHA_KEY must be defined");
}
// List here all the values that will be returned by the config factory
export interface ApiConfig {
  REACT_APP_WALLET: string;
  REACT_APP_EULOGIN: string;
  REACT_APP_API_URL: string;
}
const basename = (
  PUBLIC_URL.startsWith("http") ? new URL(PUBLIC_URL).pathname : PUBLIC_URL
).replace(/\/+$/, "");

const defaultConfig: { [index: string]: ApiConfig } = {
  local: {
    REACT_APP_WALLET: "http://localhost:3000/users-onboarding",
    REACT_APP_EULOGIN: "https://ecas.acceptance.ec.europa.eu/cas",
    REACT_APP_API_URL: "http://localhost:3002/users-onboarding/v1",
  },
  test: {
    REACT_APP_WALLET: "https://app.intebsi.xyz/users-onboarding",
    REACT_APP_EULOGIN: "https://ecas.ec.europa.eu/cas",
    REACT_APP_API_URL: "https://api.test.intebsi.xyz/users-onboarding/v1",
  },
  pilot: {
    REACT_APP_WALLET: "https://app.ebsi.xyz/users-onboarding",
    REACT_APP_EULOGIN: "https://ecas.ec.europa.eu/cas",
    REACT_APP_API_URL: "https://api.preprod.ebsi.eu/users-onboarding/v1",
  },
  prod: {
    REACT_APP_WALLET: "https://app.ebsi.tech.ec.europa.eu/users-onboarding",
    REACT_APP_EULOGIN: "https://ecas.ec.europa.eu/cas",
    REACT_APP_API_URL: "https://api.ebsi.eu/users-onboarding/v1",
  },
};

const env = {
  PUBLIC_URL,
  BASENAME: basename,
  REACT_APP_EBSI_ENV,
  REACT_APP_API_URL:
    process.env.REACT_APP_API_URL ||
    defaultConfig[REACT_APP_EBSI_ENV].REACT_APP_API_URL,
  REACT_APP_WALLET:
    process.env.REACT_APP_WALLET ||
    defaultConfig[REACT_APP_EBSI_ENV].REACT_APP_WALLET,
  REACT_APP_EULOGIN:
    process.env.REACT_APP_EULOGIN ||
    defaultConfig[REACT_APP_EBSI_ENV].REACT_APP_EULOGIN,
  REACT_APP_CAPTCHA_KEY: process.env.REACT_APP_CAPTCHA_KEY,
};

export default env;
