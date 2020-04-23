import base64url from "base64url";
import { ethers } from "ethers";
import { JWT, JWK } from "jose";
import { v4 as uuidv4 } from "uuid";
import * as util from "util";
import KeyEncoder from "key-encoder";
import fs from "fs";
import {
  DEFAULT_VERIFIABLEID_TYPE,
  DEFAULT_VID_TYPE_TEXT,
  DEFAULT_DIPLOMA_TYPE,
  DEFAULT_DIPLOMA_TYPE_TEXT,
} from "./constants";
import { FullVC, FullVID, DiplomaIssuer } from "./types";
import {
  WALLET_DATA_STORE_TYPE_MAP,
  WALLET_DATA_STORE_CONFIG_MAP,
} from "../config";
import LOGGER from "../logger";
import { API_ERROR_MESSAGES, InternalError } from "../errors";
import { IComponentAuthZToken } from "../libs/authManager/secureEnclave/JWT";

const toHex = (data: string): string =>
  Buffer.from(data, "base64").toString("hex");

const generateKeys = (): JWK.ECKey =>
  JWK.generateSync("EC", "secp256k1", { use: "sig" });

/**
 * Encodes a string in Base64 format
 * @param input data to encode in base64
 */
const b64EncodeUrl = (input: string): string => base64url.encode(input);

/**
 * Decodes a Base64 string in an UTF-8 string format
 * @param input Base64 encoded string to decode
 */
const strB64dec = (input: string): string => base64url.decode(input);

/**
 * Generates a keccak256
 * @param input string data to generate a SHA-256 hash
 */
const hash = (input: string | Buffer): string => {
  if (typeof input === "string") {
    return ethers.utils.keccak256(`0x${Buffer.from(input).toString("hex")}`);
  }
  // already a Buffer
  return ethers.utils.keccak256(input);
};

/**
 * Generates a keccak256
 * @param filename path+filename of the file to be hashed
 */
const hashFromFile = (filename: string): string => {
  const data = fs.readFileSync(filename);
  return ethers.utils.keccak256(data);
};

const isHex = (data: string): boolean => {
  const regex = new RegExp(/^[0-9a-fA-F]+$/g);
  return regex.test(data);
};

const getStorageConfig = (walletStorageType: number): [string, string] => {
  const storageType = WALLET_DATA_STORE_TYPE_MAP.get(walletStorageType);
  if (typeof storageType === "undefined")
    throw new InternalError(API_ERROR_MESSAGES.INVALID_WALLET_STORAGE_TYPE);

  const storageConfig = WALLET_DATA_STORE_CONFIG_MAP.get(storageType);
  if (typeof storageConfig === "undefined")
    throw new InternalError(API_ERROR_MESSAGES.INVALID_DATA_STORE_CONFIG_TYPE);

  return storageConfig;
};

const setId = (prefix: string): string => `${prefix}-${uuidv4()}`;

const setCredId = (): string => setId("cred");

const setCredType = (credType: string): string => {
  // usually credential type is a string with an array of strings "['VerifiableCredential', 'EssifVerifiableID']"
  // but when building a Verifiable Presentation, it needs to be shown to the user this Credential Type,
  // so we simplify it with just one string more UI friendly: EssifVerifiableID -> Verifiable ID
  let outCredType = credType;
  const tmpCredType: string[] = [];
  if (credType.includes(DEFAULT_VERIFIABLEID_TYPE))
    tmpCredType.push(DEFAULT_VID_TYPE_TEXT);
  if (credType.includes(DEFAULT_DIPLOMA_TYPE))
    tmpCredType.push(DEFAULT_DIPLOMA_TYPE_TEXT);
  if (tmpCredType.length > 0) outCredType = JSON.stringify(tmpCredType);

  return outCredType;
};

const setCredName = (credType: string, base64Data: string): string => {
  if (credType.includes(DEFAULT_VERIFIABLEID_TYPE))
    return DEFAULT_VID_TYPE_TEXT;
  if (credType.includes(DEFAULT_DIPLOMA_TYPE)) {
    const fullVC: FullVC = JSON.parse(strB64dec(base64Data));
    if (fullVC && fullVC.title && fullVC.title[0] && fullVC.title[0].text)
      return fullVC.title[0].text;
  }
  return credType;
};

const setCredIssuer = (credType: string, base64Data: string): string => {
  if (credType === DEFAULT_VID_TYPE_TEXT) {
    const fullVID: FullVID = JSON.parse(strB64dec(base64Data));
    if (fullVID && fullVID.issuer) return fullVID.issuer;
  }
  if (credType === DEFAULT_DIPLOMA_TYPE_TEXT) {
    const fullVC: FullVC = JSON.parse(strB64dec(base64Data));
    if (fullVC && fullVC.issuer) {
      const issuer = <DiplomaIssuer>fullVC.issuer;
      if (issuer.organization && issuer.organization.preferredName) {
        return issuer.organization.preferredName;
      }
      return fullVC.issuer.toString();
    }
  }
  return "";
};

const isTokenExpired = (token: string): boolean => {
  const payload = <IComponentAuthZToken>JWT.decode(token);
  if (!payload) return true;
  if (!payload.exp) return true;
  if (!payload.iat) return true;
  // check if token is still active (greater than 15 minutes
  const now = Date.now();
  if (+payload.exp * 1000 > now) return false;
  return true;
};

const PRINT = (data: any, level: string, operation?: string): void => {
  LOGGER.log({
    message: data,
    level,
    operation,
  });
};

const PRINT_INFO = (data: any, operation?: string): void => {
  PRINT(util.inspect(data), "info", operation);
};

const PRINT_DEBUG = (data: any, operation?: string): void => {
  PRINT(util.inspect(data), "debug", operation);
};

const PRINT_ERROR = (error: any, operation?: string): void => {
  LOGGER.error(util.inspect(error), "error", operation);
  if (error.response) {
    LOGGER.error(util.inspect(error.response.data));
  }
};

const PRINT_SILLY = (data: any, operation?: string): void => {
  let toPrint = data;
  if (typeof toPrint !== "string") toPrint = util.inspect(data);
  PRINT(`\n${toPrint}`, "silly", operation);
};

const PRINT_JSON = (data: any): void => {
  // it assumes DEBUG level
  let toPrint = data;
  if (typeof toPrint !== "string") toPrint = util.inspect(data);
  PRINT_DEBUG(`\n${toPrint}`);
};

const pubkeyHexToPem = (pubkeyHex: string): string => {
  const keyEncoder = new KeyEncoder("secp256k1");
  // removes the initial 0x
  const rawPubKey = pubkeyHex.includes("0x") ? pubkeyHex.slice(2) : pubkeyHex;

  return keyEncoder.encodePublic(rawPubKey, "raw", "pem");
};

export {
  toHex,
  PRINT_INFO,
  PRINT_DEBUG,
  PRINT_ERROR,
  PRINT_SILLY,
  PRINT_JSON,
  b64EncodeUrl,
  strB64dec,
  hash,
  setId,
  isHex,
  getStorageConfig,
  setCredId,
  isTokenExpired,
  setCredType,
  setCredName,
  setCredIssuer,
  hashFromFile,
  pubkeyHexToPem,
  generateKeys,
};
