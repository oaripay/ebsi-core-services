// CONFIG PROJECT FILE
import * as dotenv from "dotenv";
// importing .env variables
dotenv.config();

const LOCALHOST = "http://localhost";
const EBSI_API_DEV_URL = "https://api.ebsi.xyz";
const EBSI_API_INT_URL = "https://api.intebsi.xyz";
const EBSI_API_PROD_URL = "https://api.ebsi.tech.ec.europa.eu";
const OPENAPI_PATH = "../../api/openapi.yaml";
const API_VERSION = "v1";
const EBSI_STORES = "distributed";

// GLOBAL ENVIRONMENT CONFIG AND URLS PER EACH ENV
const GLOBAL_CONFIG = {
  production: {
    logLevel: "info",
    ebsiApiBaseUrl: EBSI_API_PROD_URL,
  },
  development: {
    logLevel: "info",
    ebsiApiBaseUrl: EBSI_API_DEV_URL,
  },
  integration: {
    logLevel: "debug",
    ebsiApiBaseUrl: EBSI_API_INT_URL,
  },
  test: {
    logLevel: "info",
    ebsiApiBaseUrl: EBSI_API_INT_URL,
  },
  local: {
    logLevel: process.env.DEBUG_LEVEL ? process.env.DEBUG_LEVEL : "silly",
    ebsiApiBaseUrl: EBSI_API_INT_URL,
  },
};

const ENVIRONMENT =
  process.env.EBSI_ENV === "test" ||
  process.env.EBSI_ENV === "production" ||
  process.env.EBSI_ENV === "development" ||
  process.env.EBSI_ENV === "local"
    ? process.env.EBSI_ENV
    : "integration"; // integration by default

const FINAL_CONFIG = GLOBAL_CONFIG[ENVIRONMENT];
const LOG_LEVEL = FINAL_CONFIG.logLevel;
const EBSI_DEFAULT_DATA_STORE = "cassandra";
const EBSI_EXTERNAL_API_BASE_URL = FINAL_CONFIG.ebsiApiBaseUrl;

const EBSI_BASE_PATH = {
  API_DOCS: "/api-docs",
  DID: `/did/${API_VERSION}`,
  LEDGER: `/ledger/${API_VERSION}`,
  WALLET: `/wallet/${API_VERSION}`,
  STORAGE: `/storage/${API_VERSION}`,
  IDHUB: `/identity-hub/${API_VERSION}`,
  EIDAS: `/eidas-bridge/${API_VERSION}`,
  BESU: `/ledger/${API_VERSION}/blockchains/besu`,
  FILE_STORAGE: `/storage/${API_VERSION}/stores/${EBSI_STORES}/files`,
  TRUSTED_APPS_REGISTRY: `/trusted-apps-registry/${API_VERSION}`,
  KEY_VALUE_STORAGE: `/storage/${API_VERSION}/stores/${EBSI_STORES}/key-values`,
};

const EBSI_SERVICE_NAME = {
  DID: "DID API",
  BESU: "BESU API",
  LEDGER: "LEDGER API",
  WALLET: "WALLET API",
  API_DOCS: "API DOCS",
  STORAGE: "STORAGE API",
  IDHUB: "IDENTITY HUB API",
  EIDAS: "EIDAS BRIDGE API",
  FILE_STORAGE: "FILE_STORAGE API",
  KEY_VALUE_STORAGE: "KEY_VALUE_STORAGE API",
  TRUSTED_APPS_REGISTRY: "TRUSTED_APPS_REGISTRY API",
};

const EBSI_SERVICE_BASE_URL = {
  DID: EBSI_EXTERNAL_API_BASE_URL,
  BESU: EBSI_EXTERNAL_API_BASE_URL,
  LEDGER: EBSI_EXTERNAL_API_BASE_URL,
  WALLET: EBSI_EXTERNAL_API_BASE_URL,
  API_DOCS: EBSI_EXTERNAL_API_BASE_URL,
  STORAGE: EBSI_EXTERNAL_API_BASE_URL,
  IDHUB: LOCALHOST,
  EIDAS: EBSI_EXTERNAL_API_BASE_URL,
  FILE_STORAGE: EBSI_EXTERNAL_API_BASE_URL,
  KEY_VALUE_STORAGE: EBSI_EXTERNAL_API_BASE_URL,
  TRUSTED_APPS_REGISTRY: EBSI_EXTERNAL_API_BASE_URL,
};

const EBSI_SERVICE_PORT = {
  IDHUB: process.env.IDHUB_PORT ? +process.env.IDHUB_PORT : 9000,
};

const EBSI_SERVICE_SWAGGER = {
  IDHUB: EBSI_BASE_PATH.IDHUB + EBSI_BASE_PATH.API_DOCS,
};

const EBSI_SERVICE_CALL = {
  API_DOCS: "/api-docs",
  EBSI_LOGIN: "/sessions",
  RESOLVE_DID: "/identifiers",
  GET_ATTRIBUTE: "/attributes",
  SET_ATTRIBUTE: "/attributes",
  GET_ATTRIBUTES: "/attributes",
};

const EBSI_SERVICE_URL = {
  DID: `${EBSI_SERVICE_BASE_URL.DID}${EBSI_BASE_PATH.DID}`,
  BESU: `${EBSI_SERVICE_BASE_URL.BESU}${EBSI_BASE_PATH.BESU}`,
  EIDAS: `${EBSI_SERVICE_BASE_URL.EIDAS}${EBSI_BASE_PATH.EIDAS}`,
  IDHUB: `${EBSI_SERVICE_BASE_URL.IDHUB}:${EBSI_SERVICE_PORT.IDHUB}${EBSI_BASE_PATH.IDHUB}`,
  LEDGER: `${EBSI_SERVICE_BASE_URL.LEDGER}${EBSI_BASE_PATH.LEDGER}`,
  WALLET: `${EBSI_SERVICE_BASE_URL.WALLET}${EBSI_BASE_PATH.WALLET}`,
  STORAGE: `${EBSI_SERVICE_BASE_URL.STORAGE}${EBSI_BASE_PATH.STORAGE}`,
  API_DOCS: `${EBSI_SERVICE_BASE_URL.API_DOCS}${EBSI_BASE_PATH.API_DOCS}`,
  FILE_STORAGE: `${EBSI_SERVICE_BASE_URL.FILE_STORAGE}${EBSI_BASE_PATH.FILE_STORAGE}`,
  KEY_VALUE_STORAGE: `${EBSI_SERVICE_BASE_URL.FILE_STORAGE}${EBSI_BASE_PATH.KEY_VALUE_STORAGE}`,
  TRUSTED_APPS_REGISTRY: `${EBSI_SERVICE_BASE_URL.TRUSTED_APPS_REGISTRY}${EBSI_BASE_PATH.TRUSTED_APPS_REGISTRY}`,
};

const EBSI_SERVICE_SWAGGER_FULL_URL = {
  IDHUB: EBSI_SERVICE_URL.IDHUB + EBSI_BASE_PATH.API_DOCS,
};

const EBSI_SERVICE_EXTERNAL_SWAGGER_FULL_URL = {
  IDHUB:
    EBSI_EXTERNAL_API_BASE_URL + EBSI_BASE_PATH.IDHUB + EBSI_BASE_PATH.API_DOCS,
};

const EBSI_SERVICE = {
  NAME: EBSI_SERVICE_NAME,
  BASE_URL: EBSI_SERVICE_BASE_URL,
  PORT: EBSI_SERVICE_PORT,
  SWAGGER: EBSI_SERVICE_SWAGGER,
  CALL: EBSI_SERVICE_CALL,
  URL: EBSI_SERVICE_URL,
  BASE_PATH: EBSI_BASE_PATH,
  SWAGGER_INTERNAL_URL: EBSI_SERVICE_SWAGGER_FULL_URL,
  SWAGGER_EXTERNAL_URL: EBSI_SERVICE_EXTERNAL_SWAGGER_FULL_URL,
};

enum EbsiApps {
  BESU = "ebsi-ledger",
  IDHUB = "ebsi-idhub",
  EIDAS = "ebsi-eidas",
  WALLET = "ebsi-wallet",
  STORAGE = "ebsi-storage",
  FILE_STORAGE = "ebsi-storage",
  KEY_VALUE_STORAGE = "ebsi-storage",
  REQUEST_QUEUE_STORAGE = "ebsi-storage",
}

const EBSI_API_MAP = new Map<string, string>([
  [EbsiApps.BESU, EBSI_SERVICE.URL.LEDGER],
  [EbsiApps.IDHUB, EBSI_SERVICE.URL.IDHUB],
  [EbsiApps.EIDAS, EBSI_SERVICE.URL.EIDAS],
  [EbsiApps.WALLET, EBSI_SERVICE.URL.WALLET],
  [EbsiApps.STORAGE, EBSI_SERVICE.URL.STORAGE],
]);

export enum EbsiDataStoreType {
  FILE_STORAGE,
  KEY_VALUE_STORAGE,
}

export enum WalletDataStoreType {
  ATTRIBUTES_INFO_LIST_STORAGE,
  ATTRIBUTES_FILE_STORAGE,
}

const WalletDataStoreTypeMap = new Map<number, number>([
  [WalletDataStoreType.ATTRIBUTES_FILE_STORAGE, EbsiDataStoreType.FILE_STORAGE],

  [
    WalletDataStoreType.ATTRIBUTES_INFO_LIST_STORAGE,
    EbsiDataStoreType.KEY_VALUE_STORAGE,
  ],
]);

const WALLET_DATA_STORE_CONFIG_MAP = new Map<number, [string, string]>([
  [
    EbsiDataStoreType.FILE_STORAGE,
    [EBSI_SERVICE.URL.FILE_STORAGE, EbsiApps.FILE_STORAGE],
  ],
  [
    EbsiDataStoreType.KEY_VALUE_STORAGE,
    [EBSI_SERVICE.URL.KEY_VALUE_STORAGE, EbsiApps.KEY_VALUE_STORAGE],
  ],
]);

enum WalletDataStoreConfig {
  URI,
  EBSI_APP_NAME,
}

const throwError = (varName: string) => {
  throw new Error(`${varName} not provided as ENV variable`);
};
const API_NAME = EbsiApps.IDHUB;
const API_PRIVATE_KEY = process.env.API_PRIVATE_KEY
  ? process.env.API_PRIVATE_KEY
  : throwError("API_PRIVATE_KEY");

export {
  API_NAME,
  LOG_LEVEL,
  EbsiApps,
  ENVIRONMENT,
  EBSI_API_MAP,
  EBSI_SERVICE,
  OPENAPI_PATH,
  API_PRIVATE_KEY,
  EBSI_DEFAULT_DATA_STORE,
  WalletDataStoreConfig,
  WalletDataStoreTypeMap,
  WALLET_DATA_STORE_CONFIG_MAP,
};
