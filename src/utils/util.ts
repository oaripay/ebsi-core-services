import base64url from "base64url";
import { AxiosError } from "axios";
import { ethers } from "ethers";
import { JWT } from "jose";
import { v4 as uuidv4 } from "uuid";
import * as util from "util";
import fs from "fs";
import {
  WalletDataStoreTypeMap,
  WALLET_DATA_STORE_CONFIG_MAP,
  ENVIRONMENT,
} from "../config";
import LOGGER from "../logger";
import {
  ApiErrorMessages,
  InternalServerError,
  ProblemDetailsError,
} from "../errors";
import { IComponentAuthZToken } from "../libs/authManager/secureEnclave/jwt";

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

const isHash = (data: string): boolean => {
  const hexDigits = data.replace("0x", "");
  return hexDigits.length === 64 && isHex(hexDigits);
};

const getStorageConfig = (walletStorageType: number): [string, string] => {
  const storageType = WalletDataStoreTypeMap.get(walletStorageType);
  if (typeof storageType === "undefined")
    throw new InternalServerError(InternalServerError.defaultTitle, {
      detail: ApiErrorMessages.INVALID_WALLET_STORAGE_TYPE,
    });

  const storageConfig = WALLET_DATA_STORE_CONFIG_MAP.get(storageType);
  if (typeof storageConfig === "undefined")
    throw new InternalServerError(InternalServerError.defaultTitle, {
      detail: ApiErrorMessages.INVALID_DATA_STORE_CONFIG_TYPE,
    });

  return storageConfig;
};

const setId = (prefix: string): string => `${prefix}-${uuidv4()}`;

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
  if (ENVIRONMENT === "test") {
    LOGGER.silent = true;
  }
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

const PRINT_ERROR = (error: Error, operation?: string): void => {
  if (ENVIRONMENT === "test") {
    LOGGER.silent = true;
  }
  // check if it is an EBSI error
  if (error instanceof ProblemDetailsError) {
    LOGGER.error(error.title, "error", operation);
    LOGGER.error(error.status.toString(), "error", operation);
    LOGGER.error(error.detail || "", "error", operation);
  } else {
    LOGGER.error(error.message, "error", operation);
    LOGGER.error(error.name, "error", operation);
    if (error.stack) LOGGER.error(error.stack, "error", operation);
  }
  if ((error as AxiosError).response) {
    LOGGER.error(util.inspect((error as AxiosError).response!.data));
  }
};

const PRINT_SILLY = (data: any, operation?: string): void => {
  let toPrint = data;
  if (typeof toPrint !== "string") toPrint = util.inspect(data);
  PRINT(`\n${toPrint}`, "silly", operation);
};

export {
  hash,
  setId,
  isHex,
  isHash,
  strB64dec,
  PRINT_INFO,
  PRINT_DEBUG,
  PRINT_ERROR,
  PRINT_SILLY,
  b64EncodeUrl,
  hashFromFile,
  isTokenExpired,
  getStorageConfig,
};
