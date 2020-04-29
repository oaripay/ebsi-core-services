import axios from "axios";
import { JWK, JWKECKey } from "jose";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { SimpleSigner, createJWT } from "did-jwt";
import { ethers } from "ethers";
import { COMPONENT_KEYSTORE, API_NAME, LOG_LEVEL } from "../../src/config";
import {
  LegalEntityAuthNToken,
  UserAuthNToken,
} from "../../src/libs/authManager/secureEnclave/jwt";
import { PRINT_SILLY, PRINT_DEBUG } from "../../src/utils/util";
import { InternalError, API_ERROR_MESSAGES } from "../../src/errors";
import { InitComponent } from "../../src/libs/authManager/secureEnclave";
import ComponentSecureEnclave from "../../src/libs/authManager/secureEnclave/componentSecureEnclave";
import AuthManager from "../../src/libs/authManager/authManager";

const mockComponentKey = JWK.asKey({
  crv: "secp256k1",
  x: "rIVa2go50gSs5pCDF5wY-fb5-TzTzyCWA9R8Ljuu5Xw",
  y: "89yC4d1PzbZArCq-YI17hzFV3ZDOMlj9G8ufRKBl8o8",
  d: "-FdUSp0Ql-JC_wsoen5ukPGc-XPv4jF_KkZ4c5ZkQg8",
  kty: "EC",
  kid: "G5m5Nlbi7FZXOMYG7g-gKB-UFvEAIU2PY3HT7HVmbBs",
});

const mockComponentDid = "did:ebsi:0x04-mocked-did"; // the actual DID -> 'did:ebsi:0x4d3171BaF3eC3CE370Ec65E7D354741a970ba038';
const mockInitComponent: InitComponent = {
  did: mockComponentDid,
  key: mockComponentKey.toJWK(false),
};

const mockedUserUE = {
  uid: "n002toor",
  firstname: "Eva",
  lastname: "Long",
};

const testAuthNToken = async (): Promise<{
  did: string;
  key: JWKECKey;
  token: string;
}> => {
  const se = ComponentSecureEnclave.Instance;
  const { did, key } = await se.init(COMPONENT_KEYSTORE);
  const token = await AuthManager.Instance.createAuthNToken(API_NAME);
  return { did, key, token };
};

const testEntityAuthNToken = async (
  enterpiseName?: string
): Promise<string> => {
  const payload: LegalEntityAuthNToken = {
    iss: enterpiseName || `Test Legal Entity`,
    aud: API_NAME,
    iat: moment().unix(),
    exp: moment().add(15, "minutes").unix(),
    nonce: uuidv4(),
  };
  const buffer = Buffer.from(JSON.stringify(payload));
  const se = ComponentSecureEnclave.Instance;
  await se.init(COMPONENT_KEYSTORE);

  const jwt = await se.signJwt(se.enclaveDid, buffer);
  return jwt;
};

const testUserAuthNToken = async (): Promise<{
  did: string;
  token: string;
  ticket: string;
}> => {
  // generate a new keypair
  const jwk = JWK.generateSync("EC", "secp256k1", { use: "sig" });
  const privKeyString = Buffer.from(<string>jwk.d, "base64").toString("hex");
  const wallet: ethers.Wallet = new ethers.Wallet(privKeyString);
  const did = `did:ebsi:${wallet.address}`;

  const payload: UserAuthNToken = {
    iss: did,
    aud: API_NAME,
    iat: moment().unix(),
    exp: moment().add(15, "minutes").unix(),
    ticket: "ST-12585-Sample-ticket",
    publicKey: new ethers.utils.SigningKey(wallet.privateKey).publicKey,
  };
  const signer = SimpleSigner(wallet.privateKey.replace("0x", "")); // Removing 0x from wallet private key as input of SimpleSigner
  const token = await createJWT(payload, {
    issuer: `${did}`,
    alg: "ES256K-R",
    signer,
  });
  return { did, token, ticket: payload.ticket };
};

interface TestingSetup {
  belgiumGovToken: string;
  belgiumGovDid: string;
  enterpriseToken: string;
  enterpriseDid: string;
  userToken: string;
  userDid: string;
}

async function auxDoGetCallWithToken(token: string, url: string): Promise<any> {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(config);
  }
  const response = await axios.get(url, config);
  return response.data;
}

async function initSecureEnclave(): Promise<string> {
  const { did } = await ComponentSecureEnclave.Instance.init(
    COMPONENT_KEYSTORE
  );
  if (!did) throw new InternalError(API_ERROR_MESSAGES.ENCLAVE_DID_NULL);
  PRINT_DEBUG(`Secure Enclave initialized with DID:${did}`);

  return did;
}

function mockedSetupForTesting(): TestingSetup {
  const enterpriseToken =
    "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJkZW1vIHRlc3QiLCJpYXQiOjE1ODYzNTY5MzQsImV4cCI6MTU4NjM1NzgzNCwiYXVkIjoiZWJzaS13YWxsZXQiLCJkaWQiOiJkaWQ6ZWJzaToweEFiZDQwZkNjNDc1NzRGMTg2NUFGNzc4NGRCNDcxZTVlN2Q1N0UwQmEiLCJlbnRlcnByaXNlTmFtZSI6ImRlbW8gdGVzdCIsIm5vbmNlIjoiMmt0ZDJGc2JHVjBJbjAuIn0.2e-YW3c-ZYnv_HxGS94aZZeLRdUEOj6IFQZjb3yWkX4TcBRP-72tXIi0c_4mpI15Eb8VGk9ajGCQf8C1_QFlKA";
  const enterpriseDid = "did:ebsi:0xAbd40fCc47574F1865AF7784dB471e5e7d57E0Ba";
  const belgiumGovToken =
    "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJCZWxnaXVtIEdvdmVybm1lbnQiLCJpYXQiOjE1ODYzNTczMzQsImV4cCI6MTU4NjM1ODIzNCwiYXVkIjoiZWJzaS13YWxsZXQiLCJkaWQiOiJkaWQ6ZWJzaToweGRFM2Q4ZThmMzBCNDI1QUNlNkY2NTQ5RDMxODhBZTlGMDA0N0VhMUEiLCJlbnRlcnByaXNlTmFtZSI6IkJlbGdpdW0gR292ZXJubWVudCIsIm5vbmNlIjoiMmt0ZDJGc2JHVjBJbjAuIn0.16Q_Uy7HBDrYuwTmBT2gEG4YrpMd4KFjpa2d-kCCw3t5bJL1jmn8aIEMzaDU_rYxdMhyqYw6Sm5TN1RuNqpLOQ";
  const belgiumGovDid = "did:ebsi:0x9f99F1f7482bC56735f8Df9f3Ffb280d54395c49";
  const userToken =
    "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJldmEiLCJpYXQiOjE1ODYzNTc0NjIsImV4cCI6MTU4NjM1ODM2MiwiYXVkIjoiZWJzaS13YWxsZXQiLCJkaWQiOiJkaWQ6ZWJzaToweGM5QTg5NDBBYjMxOGQ0ZDQ2MzFhODZEY0Y5RTBiOUEzNTk0MjE0RTUiLCJ1c2VyTmFtZSI6IkVCU0kmRXZhIiwidXNlcklkIjoiZXZhIn0.6KzJNNUQHEUvhhFI9D9qreMeaekFT2-Cm9VIwfquqJjIBaNdUbCj3TpzJEEd1ml76YB52k8bGSFeNrWXKilxlA";
  const userDid = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";

  return {
    belgiumGovToken,
    belgiumGovDid,
    enterpriseToken,
    enterpriseDid,
    userToken,
    userDid,
  };
}

const mockedEnterpriseUser = {
  name: "Test Legal Entity",
  data: {
    did: "did:ebsi:0xefb3F269Bb3a0aa5BB4Cd6E6629BAa66863d3a92",
    publickey: "0x04",
  },
};

const initSetupForTesting = async (): Promise<TestingSetup> => {
  await initSecureEnclave();
  return mockedSetupForTesting();
};

async function auxDoPostCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(config);
    PRINT_SILLY(data);
  }
  const response = await axios.post(url, data, config);
  return response.data;
}

interface mockedElement {
  id: number;
  title: string;
  author: string;
}

const mockedPosts: mockedElement[] = [
  {
    id: 1,
    title: "One",
    author: "I",
  },
  {
    id: 2,
    title: "two",
    author: "I",
  },
  {
    id: 3,
    title: "three",
    author: "I",
  },
  {
    id: 4,
    title: "Four",
    author: "I",
  },
  {
    id: 5,
    title: "Five",
    author: "I",
  },
  {
    id: 6,
    title: "Six",
    author: "I",
  },
  {
    id: 7,
    title: "Seven",
    author: "I",
  },
  {
    id: 8,
    title: "Eight",
    author: "I",
  },
  {
    id: 9,
    title: "Nine",
    author: "I",
  },
  {
    id: 10,
    title: "Ten",
    author: "I",
  },
];

export {
  mockedPosts,
  mockedUserUE,
  TestingSetup,
  testAuthNToken,
  mockComponentKey,
  mockComponentDid,
  mockInitComponent,
  initSecureEnclave,
  testUserAuthNToken,
  initSetupForTesting,
  mockedEnterpriseUser,
  testEntityAuthNToken,
  auxDoGetCallWithToken,
  mockedSetupForTesting,
  auxDoPostCallWithToken,
};
