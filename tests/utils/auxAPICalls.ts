import axios from "axios";
import { JWK, JWKECKey, JWT } from "jose";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { ethers } from "ethers";
import { API_PRIVATE_KEY, API_NAME, LOG_LEVEL } from "../../src/config";
import { LegalEntityAuthNToken } from "../../src/libs/authManager/secureEnclave/jwt";
import {
  PRINT_SILLY,
  PRINT_DEBUG,
  b64EncodeUrl,
  hash,
} from "../../src/utils/util";
import { InternalError, ApiErrorMessages } from "../../src/errors";
import { InitComponent } from "../../src/libs/authManager/secureEnclave";
import ComponentSecureEnclave from "../../src/libs/authManager/secureEnclave/componentSecureEnclave";
import AuthManager from "../../src/libs/authManager/authManager";
import { IAttribute } from "../../src/dtos/attributeInfo";
import * as config from "../../src/config";
import getJWKfromHex from "../../src/libs/authManager/secureEnclave/jwk";

const toHex = (data: string): string =>
  Buffer.from(data, "base64").toString("hex");

const generateKeys = (): JWK.ECKey =>
  JWK.generateSync("EC", "secp256k1", { use: "sig" });

const generateHexPrivateKey = (): string => {
  const key = generateKeys();
  const hexPrivateKey = toHex(<string>key.d);
  return hexPrivateKey;
};

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

const mockedEnterpriseUser = {
  name: "Test Legal Entity",
  data: {
    did: "did:ebsi:0xefb3F269Bb3a0aa5BB4Cd6E6629BAa66863d3a92",
    publickey: "0x04",
  },
};

const testAuthNToken = async (): Promise<{
  did: string;
  key: JWKECKey;
  token: string;
}> => {
  const se = ComponentSecureEnclave.Instance;
  const { did, key } = await se.init(API_PRIVATE_KEY);
  const token = await AuthManager.Instance.createAuthNToken(API_NAME);
  return { did, key, token };
};

const testEntityAuthNToken = async (
  enterpiseName?: string
): Promise<{ jwt: string; jwk: JWK.ECKey; did: string }> => {
  // generate a new keypair
  const jwk = JWK.generateSync("EC", "secp256k1", { use: "sig" });
  const privKeyString = Buffer.from(<string>jwk.d, "base64").toString("hex");
  const wallet: ethers.Wallet = new ethers.Wallet(privKeyString);
  const did = `did:ebsi:${wallet.address}`;

  const payload: LegalEntityAuthNToken = {
    iss: enterpiseName || mockedEnterpriseUser.name,
    aud: API_NAME,
    iat: moment().unix(),
    exp: moment().add(15, "minutes").unix(),
    nonce: uuidv4(),
  };

  const jwt = JWT.sign(payload, jwk, {
    header: {
      alg: "ES256K",
      typ: "JWT",
    },
  });
  return { jwt, jwk, did };
};

interface TestingSetup {
  token: string;
  did: string;
}

async function auxDoGetCallWithToken(token: string, url: string): Promise<any> {
  const configHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(configHeaders);
  }
  const response = await axios.get(url, configHeaders);
  return response.data;
}

async function initSecureEnclave(): Promise<string> {
  const { did } = await ComponentSecureEnclave.Instance.init(API_PRIVATE_KEY);
  if (!did) throw new InternalError(ApiErrorMessages.ENCLAVE_DID_NULL);
  PRINT_DEBUG(`Secure Enclave initialized with DID:${did}`);

  return did;
}

const generateToken = (opts?: { [key: string]: string | number }) => {
  const payload = {
    aud: config.API_NAME,
    iss: config.API_NAME,
    ...opts,
  };
  const wallet = new ethers.Wallet(config.API_PRIVATE_KEY);
  const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
  const jwk = getJWKfromHex(signingKey.publicKey, signingKey.privateKey);

  const token = JWT.sign(payload, jwk, {
    algorithm: "ES256K",
    header: {
      typ: "JWT",
    },
    expiresIn: "900 seconds",
  });

  return {
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: 900,
    issuedAt: Math.round(Date.now() / 1000),
  };
};

const initSetupForTesting = async (): Promise<TestingSetup> => {
  const randNum: number = Math.floor(Math.random() * 1000000);
  const keyJwk = JWK.generateSync("EC", "secp256k1", { use: "sig" });
  const hexkey = Buffer.from(<string>keyJwk.d, "base64").toString("hex");
  const wallet = new ethers.Wallet(hexkey);
  const did = `did:ebsi:${wallet.address}`;
  const response = generateToken({
    did,
    nonce: `zizu-${randNum}`, // nonce from the request
    sub: `TEST ENTITY-${randNum}`, // entity Name
  });
  PRINT_DEBUG(`Access token: ${response.accessToken}`);
  PRINT_DEBUG(`DID: ${did}`);

  return {
    token: response.accessToken,
    did,
  };
};

async function auxDoPostCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const confiHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(confiHeaders);
    PRINT_SILLY(data);
  }
  const response = await axios.post(url, data, confiHeaders);
  return response.data;
}

interface MockedElement {
  id: number;
  title: string;
  author: string;
}

const mockedPosts: MockedElement[] = [
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

const randNum: number = Math.floor(Math.random() * 1000000);

const mockedAttributes: IAttribute[] = [
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType2"],
    name: "Attribute Sample 01",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-01-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-01-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType3"],
    name: "Attribute Sample 02",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-02-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-02-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType4"],
    name: "Attribute Sample 03",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-03-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-03-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType5"],
    name: "Attribute Sample 04",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-04-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-04-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType2"],
    name: "Attribute Sample 05",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-05-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-05-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType2"],
    name: "Attribute Sample 06",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-06-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-06-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType2"],
    name: "Attribute Sample 07",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-07-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-07-${randNum}` }))
    ),
  },
  {
    id: uuidv4(),
    type: ["attributeType1", "attributeType3"],
    name: "Attribute Sample 08",
    data: {
      base64: b64EncodeUrl(
        JSON.stringify({ test: `sample Data-08-${randNum}` })
      ),
    },
    did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    hash: hash(
      b64EncodeUrl(JSON.stringify({ test: `sample Data-08-${randNum}` }))
    ),
  },
];

export {
  toHex,
  mockedPosts,
  mockedUserUE,
  TestingSetup,
  generateKeys,
  testAuthNToken,
  mockedAttributes,
  mockComponentKey,
  mockComponentDid,
  mockInitComponent,
  initSecureEnclave,
  initSetupForTesting,
  mockedEnterpriseUser,
  testEntityAuthNToken,
  generateHexPrivateKey,
  auxDoGetCallWithToken,
  auxDoPostCallWithToken,
};
