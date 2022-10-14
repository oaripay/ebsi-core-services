declare global {
  interface Window {
    REACT_APP_CAPTCHA_KEY?: string;
    REACT_APP_EBSI_API_DOMAIN?: string;
    REACT_APP_EBSI_APP_DOMAIN?: string;
    REACT_APP_EULOGIN?: string; // "https://ecas.acceptance.ec.europa.eu/cas" or "https://ecas.ec.europa.eu/cas"
  }
}

const REACT_APP_EBSI_API_DOMAIN =
  process.env.REACT_APP_EBSI_API_DOMAIN || window.REACT_APP_EBSI_API_DOMAIN;
const REACT_APP_EBSI_APP_DOMAIN =
  process.env.REACT_APP_EBSI_APP_DOMAIN || window.REACT_APP_EBSI_APP_DOMAIN;
const REACT_APP_EULOGIN =
  process.env.REACT_APP_EULOGIN || window.REACT_APP_EULOGIN;
const REACT_APP_CAPTCHA_KEY =
  process.env.REACT_APP_CAPTCHA_KEY || window.REACT_APP_CAPTCHA_KEY;
const PUBLIC_URL = process.env.PUBLIC_URL;

if (!PUBLIC_URL && PUBLIC_URL !== "") {
  throw new Error("PUBLIC_URL must be defined");
}
if (!REACT_APP_CAPTCHA_KEY && REACT_APP_CAPTCHA_KEY !== "") {
  throw new Error("REACT_APP_CAPTCHA_KEY must be defined");
}
if (!REACT_APP_EBSI_API_DOMAIN && REACT_APP_EBSI_API_DOMAIN !== "") {
  throw new Error("REACT_APP_EBSI_API_DOMAIN must be defined");
}
if (!REACT_APP_EBSI_APP_DOMAIN && REACT_APP_EBSI_APP_DOMAIN !== "") {
  throw new Error("REACT_APP_EBSI_APP_DOMAIN must be defined");
}
if (!REACT_APP_EULOGIN && REACT_APP_EULOGIN !== "") {
  throw new Error("REACT_APP_EULOGIN must be defined");
}
if (
  ![
    "https://ecas.acceptance.ec.europa.eu/cas",
    "https://ecas.ec.europa.eu/cas",
  ].includes(REACT_APP_EULOGIN)
) {
  throw new Error(
    `Invalid REACT_APP_EULOGIN: it must either be https://ecas.acceptance.ec.europa.eu/cas or https://ecas.ec.europa.eu/cas. Provided: ${
      REACT_APP_EULOGIN || "undefined or empty string"
    }`
  );
}

const basename = (
  PUBLIC_URL.startsWith("http") ? new URL(PUBLIC_URL).pathname : PUBLIC_URL
).replace(/\/+$/, "");

const apiPathname = "/users-onboarding/v2";

const env = {
  PUBLIC_URL,
  BASENAME: basename,
  REACT_APP_API_URL: REACT_APP_EBSI_API_DOMAIN + apiPathname,
  REACT_APP_WALLET: REACT_APP_EBSI_APP_DOMAIN + basename,
  REACT_APP_EULOGIN,
  REACT_APP_CAPTCHA_KEY,
};

export default env;
