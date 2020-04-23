import axios from "axios";
import { PRINT_SILLY, PRINT_ERROR } from "./util";
import { LOG_LEVEL } from "../config";
import { ICASFile } from "../daos/casFile";
import { ICASStorageOut } from "../dtos/dataStorage";

import FormData = require("form-data");

async function doInternalPostCall(data: any, url: string): Promise<any> {
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(data);
  }
  try {
    const response = await axios.post(url, data);
    if (LOG_LEVEL === "silly") {
      PRINT_SILLY("AXIOS RESPONSE: ");
      PRINT_SILLY(response.data);
    }
    return response.data;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, url);
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    throw error;
  }
}

async function doPostCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(config);
    PRINT_SILLY(data);
  }
  try {
    const response = await axios.post(url, data, config);
    if (LOG_LEVEL === "silly") {
      PRINT_SILLY("AXIOS RESPONSE: ");
      PRINT_SILLY(response.data);
    }
    return response.data;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, url);
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    throw error;
  }
}

async function doPutCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(config);
    PRINT_SILLY(data);
  }
  try {
    const response = await axios.put(url, data, config);
    if (LOG_LEVEL === "silly") {
      PRINT_SILLY("AXIOS RESPONSE: ");
      PRINT_SILLY(response.data);
    }
    return response.data;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, url);
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    throw error;
  }
}

/**
 * Executes a POST multipart/form-data call
 * @param iFile struct with the file information and the database to store
 * @param url complete url to a POST REST API call
 */
async function doPostFormCallWithToken(
  token: string,
  iFile: ICASFile,
  url: string
): Promise<ICASStorageOut> {
  const form = new FormData();
  form.append("file", iFile.fileData, iFile.fileName);
  /* USING DEFAULT VALUE: CASSANDRA !!!
  if (iFile.database != null)
    form.append('database', iFile.database)
  else
    form.append('database', "cassandra") // default value
  */
  form.append("database", "cassandra");
  const config = {
    headers: {
      post: form.getHeaders(),
      Authorization: `Bearer ${token}`,
    },
  };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}**** SENDING A FILE ****`);
    PRINT_SILLY(config);
  }

  try {
    const response = await axios.post(url, form, config);
    if (LOG_LEVEL === "silly") {
      PRINT_SILLY("AXIOS RESPONSE: ");
      PRINT_SILLY(response.data);
    }
    return response.data;
  } catch (error) {
    PRINT_ERROR((<Error>error).message);
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    throw error;
  }
}

async function doInternalGetCall(url: string): Promise<any> {
  if (LOG_LEVEL === "silly") PRINT_SILLY(`URL: ${url}`);
  try {
    const response = await axios.get(url);
    if (LOG_LEVEL === "silly") {
      PRINT_SILLY("AXIOS RESPONSE: ");
      PRINT_SILLY(response.data);
    }
    return response.data;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, url);
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    throw error;
  }
}

async function doGetCallWithToken(token: string, url: string): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  if (LOG_LEVEL === "silly") {
    PRINT_SILLY(`URL: ${url}`);
    PRINT_SILLY(config);
  }
  try {
    const response = await axios.get(url, config);
    if (LOG_LEVEL === "silly") {
      PRINT_SILLY("AXIOS RESPONSE: ");
      PRINT_SILLY(response.data);
    }
    return response.data;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, url);
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    throw error;
  }
}

export {
  doInternalPostCall,
  doInternalGetCall,
  doPostCallWithToken,
  doGetCallWithToken,
  doPutCallWithToken,
  doPostFormCallWithToken,
};
