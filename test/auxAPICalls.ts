import axios from "axios";
import { JWT } from "jose";
import { dto } from "../src/dtos";
import { EBSI, util } from "../src/utils";
import { EBSI_SERVICE, LOG_LEVEL, COMPONENT_KEYSTORE } from "../src/config";
import { API_ERROR_MESSAGES } from "../src/errors";
import { jwt, ComponentSecureEnclave } from "../src/libs/authManager";

const mockComponentDid = "did:ebsi:0x04-mocked-did"; // the actual DID -> 'did:ebsi:0x4d3171BaF3eC3CE370Ec65E7D354741a970ba038';

interface TestingSetup {
  belgiumGovToken: string;
  belgiumGovDID: string;
  enterpriseToken: string;
  enterpriseDID: string;
  userToken: string;
  userDID: string;
}

interface DiplomaTestingSetup extends TestingSetup {
  spanishUniToken: string;
  spanishUniDID: string;
  flandesUniToken: string;
  flandesUniDID: string;
}

async function auxDoPostCall(data: any, url: string): Promise<any> {
  if (LOG_LEVEL === "silly") {
    util.PRINT_SILLY(`URL: ${url}`);
    util.PRINT_SILLY(data);
  }
  const response = await axios.post(url, data);
  return response.data;
}

async function auxDoGetCallWithToken(token: string, url: string): Promise<any> {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  if (LOG_LEVEL === "silly") {
    util.PRINT_SILLY(`URL: ${url}`);
    util.PRINT_SILLY(config);
  }
  const response = await axios.get(url, config);
  return response.data;
}

async function getEnterpriseAuthZTokenWithName(
  enterpriseName: string
): Promise<string> {
  const randNum: number = Math.floor(Math.random() * 1000000);
  const data = {
    enterpriseName,
    nonce: `Swagger-${randNum}`,
  };
  const url = EBSI_SERVICE.URL.WALLET + EBSI_SERVICE.CALL.TOKEN;
  const response: dto.IAuthenticationOutput = await auxDoPostCall(data, url);
  if (!response || !response.jwt)
    throw Error(API_ERROR_MESSAGES.NO_AUTHZ_TOKEN);
  return response.jwt;
}

async function getEnterpriseAuthZToken(): Promise<string> {
  const randNum: number = Math.floor(Math.random() * 1000000);
  const enterpriseName = `Swagger Enterprise${randNum}`;

  return getEnterpriseAuthZTokenWithName(enterpriseName);
}

async function getUserAuthZToken(): Promise<string> {
  const randNum: number = Math.floor(Math.random() * 1000000);
  const data = {
    ticket: `Swagger-User${randNum}`,
    publicKey: `0x${randNum}`,
    did: `did:ebsi:0x${randNum}`,
    front_endpoint: "http://localhost",
    userEU: {
      uid: `Swagger-User${randNum}`,
      firstname: "swagger",
      lastname: `User${randNum}`,
    },
  };
  const url = EBSI_SERVICE.URL.WALLET + EBSI_SERVICE.CALL.USER_TOKEN;
  const response: dto.IAuthenticationOutput = await auxDoPostCall(data, url);
  if (!response || !response.jwt)
    throw Error(API_ERROR_MESSAGES.NO_AUTHZ_TOKEN);
  return response.jwt;
}

async function initSecureEnclave(): Promise<string> {
  const did: string = await ComponentSecureEnclave.Instance.init(
    COMPONENT_KEYSTORE
  );
  if (!did) throw Error(API_ERROR_MESSAGES.ENCLAVE_DID_NULL);
  util.PRINT_DEBUG(`Secure Enclave initialized with DID:${did}`);

  return did;
}

async function initSetupForTesting(): Promise<TestingSetup> {
  await initSecureEnclave();

  const enterpriseToken = await getEnterpriseAuthZToken();
  const enterpriseDID = (<jwt.IEnterpriseAuthZToken>JWT.decode(enterpriseToken))
    .did;
  util.PRINT_DEBUG(`Enterprise DID: ${enterpriseDID}`);
  const belgiumGovToken = await getEnterpriseAuthZTokenWithName(
    EBSI.BELGIUM_GOVE_NAME
  );
  const belgiumGovDID = (<jwt.IEnterpriseAuthZToken>JWT.decode(belgiumGovToken))
    .did;
  util.PRINT_DEBUG(`Belgium Government DID: ${belgiumGovDID}`);
  const userToken = await getUserAuthZToken();
  const userDID = (<jwt.IUserAuthZToken>JWT.decode(userToken)).did;
  util.PRINT_DEBUG(`User DID: ${userDID}`);

  return {
    belgiumGovToken,
    belgiumGovDID,
    enterpriseToken,
    enterpriseDID,
    userToken,
    userDID,
  };
}

async function initSetupForDiplomaTesting(): Promise<DiplomaTestingSetup> {
  const testingSetup: TestingSetup = await initSetupForTesting();
  const spanishUniToken = await getEnterpriseAuthZTokenWithName(
    EBSI.SPANISH_UNIV_NAME
  );
  const spanishUniDID = (<jwt.IEnterpriseAuthZToken>JWT.decode(spanishUniToken))
    .did;
  util.PRINT_DEBUG(`Spanish University DID: ${spanishUniDID}`);
  const flandesUniToken = await getEnterpriseAuthZTokenWithName(
    EBSI.FLANDES_GOV_NAME
  );
  const flandesUniDID = (<jwt.IEnterpriseAuthZToken>JWT.decode(flandesUniToken))
    .did;
  util.PRINT_DEBUG(`Flandes University DID: ${flandesUniDID}`);

  return {
    belgiumGovToken: testingSetup.belgiumGovToken,
    belgiumGovDID: testingSetup.belgiumGovDID,
    enterpriseToken: testingSetup.enterpriseToken,
    enterpriseDID: testingSetup.enterpriseDID,
    userToken: testingSetup.userToken,
    userDID: testingSetup.userDID,
    spanishUniToken,
    spanishUniDID,
    flandesUniToken,
    flandesUniDID,
  };
}

function mockedSetupForTesting(): TestingSetup {
  const enterpriseToken =
    "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJkZW1vIHRlc3QiLCJpYXQiOjE1ODYzNTY5MzQsImV4cCI6MTU4NjM1NzgzNCwiYXVkIjoiZWJzaS13YWxsZXQiLCJkaWQiOiJkaWQ6ZWJzaToweEFiZDQwZkNjNDc1NzRGMTg2NUFGNzc4NGRCNDcxZTVlN2Q1N0UwQmEiLCJlbnRlcnByaXNlTmFtZSI6ImRlbW8gdGVzdCIsIm5vbmNlIjoiMmt0ZDJGc2JHVjBJbjAuIn0.2e-YW3c-ZYnv_HxGS94aZZeLRdUEOj6IFQZjb3yWkX4TcBRP-72tXIi0c_4mpI15Eb8VGk9ajGCQf8C1_QFlKA";
  const enterpriseDID = "did:ebsi:0xAbd40fCc47574F1865AF7784dB471e5e7d57E0Ba";
  const belgiumGovToken =
    "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJCZWxnaXVtIEdvdmVybm1lbnQiLCJpYXQiOjE1ODYzNTczMzQsImV4cCI6MTU4NjM1ODIzNCwiYXVkIjoiZWJzaS13YWxsZXQiLCJkaWQiOiJkaWQ6ZWJzaToweGRFM2Q4ZThmMzBCNDI1QUNlNkY2NTQ5RDMxODhBZTlGMDA0N0VhMUEiLCJlbnRlcnByaXNlTmFtZSI6IkJlbGdpdW0gR292ZXJubWVudCIsIm5vbmNlIjoiMmt0ZDJGc2JHVjBJbjAuIn0.16Q_Uy7HBDrYuwTmBT2gEG4YrpMd4KFjpa2d-kCCw3t5bJL1jmn8aIEMzaDU_rYxdMhyqYw6Sm5TN1RuNqpLOQ";
  const belgiumGovDID = "did:ebsi:0xdE3d8e8f30B425ACe6F6549D3188Ae9F0047Ea1A";
  const userToken =
    "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwczovL2FwaS5pbnRlYnNpLnh5ei9lYnNpdHJ1c3RlZGFwcC9wdWJsaWMta2V5cy8iLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJzdWIiOiJldmEiLCJpYXQiOjE1ODYzNTc0NjIsImV4cCI6MTU4NjM1ODM2MiwiYXVkIjoiZWJzaS13YWxsZXQiLCJkaWQiOiJkaWQ6ZWJzaToweGM5QTg5NDBBYjMxOGQ0ZDQ2MzFhODZEY0Y5RTBiOUEzNTk0MjE0RTUiLCJ1c2VyTmFtZSI6IkVCU0kmRXZhIiwidXNlcklkIjoiZXZhIn0.6KzJNNUQHEUvhhFI9D9qreMeaekFT2-Cm9VIwfquqJjIBaNdUbCj3TpzJEEd1ml76YB52k8bGSFeNrWXKilxlA";
  const userDID = "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5";

  return {
    belgiumGovToken,
    belgiumGovDID,
    enterpriseToken,
    enterpriseDID,
    userToken,
    userDID,
  };
}

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
    util.PRINT_SILLY(`URL: ${url}`);
    util.PRINT_SILLY(config);
    util.PRINT_SILLY(data);
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
  TestingSetup,
  mockedElement,
  mockComponentDid,
  initSecureEnclave,
  getUserAuthZToken,
  initSetupForTesting,
  auxDoGetCallWithToken,
  mockedSetupForTesting,
  auxDoPostCallWithToken,
  getEnterpriseAuthZToken,
  initSetupForDiplomaTesting,
  getEnterpriseAuthZTokenWithName,
};
