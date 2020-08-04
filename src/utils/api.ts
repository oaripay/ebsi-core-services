import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import { ICASFile } from "../daos/casFile";
import { ICASStorageOut } from "../dtos/dataStorage";
import { PRINT_SILLY, PRINT_ERROR } from "./util";

async function doPostCallWithoutToken(
  data: any,
  url: string,
  config?: AxiosRequestConfig
): Promise<any> {
  PRINT_SILLY(`POST: ${url}`);
  PRINT_SILLY(data);
  try {
    const response = await axios.post(url, data, config);
    PRINT_SILLY("AXIOS POST RESPONSE: ");
    PRINT_SILLY(response.data);

    return response.data;
  } catch (error) {
    PRINT_ERROR(error);
    throw error;
  }
}

async function doPostCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  PRINT_SILLY(`POST: ${url}`);
  PRINT_SILLY(config);
  PRINT_SILLY(data);
  try {
    const response = await axios.post(url, data, config);
    PRINT_SILLY("AXIOS POST RESPONSE: ");
    PRINT_SILLY(response.data);

    return response.data;
  } catch (error) {
    PRINT_ERROR(error);
    throw error;
  }
}

async function doPutCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  PRINT_SILLY(`PUT: ${url}`);
  PRINT_SILLY(config);
  PRINT_SILLY(data);
  try {
    const response = await axios.put(url, data, config);
    PRINT_SILLY("AXIOS PUT RESPONSE: ");
    PRINT_SILLY(response.data);
    return response.data;
  } catch (error) {
    PRINT_ERROR(error);
    throw error;
  }
}

async function doPatchCallWithToken(
  token: string,
  data: any,
  url: string
): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  PRINT_SILLY(`PATCH: ${url}`);
  PRINT_SILLY(config);
  PRINT_SILLY(data);
  try {
    const response = await axios.patch(url, data, config);
    PRINT_SILLY("AXIOS PATCH RESPONSE: ");
    PRINT_SILLY(response.data);
    return response.data;
  } catch (error) {
    PRINT_ERROR(error);
    throw error;
  }
}

async function doDeleteCallWithToken(
  token: string,
  url: string
): Promise<void> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  PRINT_SILLY(`DELETE: ${url}`);
  PRINT_SILLY(config);
  try {
    await axios.delete(url, config);
    PRINT_SILLY("DELETED");
  } catch (error) {
    PRINT_ERROR(error);
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
  form.append("database", "cassandra");
  const config = {
    headers: {
      post: form.getHeaders(),
      Authorization: `Bearer ${token}`,
    },
  };
  PRINT_SILLY(`POST: ${url} **** SENDING A FILE ****`);
  PRINT_SILLY(config);

  try {
    const response = await axios.post(url, form, config);
    PRINT_SILLY("AXIOS POST FORM RESPONSE: ");
    PRINT_SILLY(response.data);
    return response.data;
  } catch (error) {
    PRINT_ERROR(error);
    throw error;
  }
}

async function doGetCallWithToken(token: string, url: string): Promise<any> {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  PRINT_SILLY(`GET: ${url}`);
  PRINT_SILLY(config);
  try {
    const response = await axios.get(url, config);
    PRINT_SILLY("AXIOS GET RESPONSE: ");
    PRINT_SILLY(response.data);
    return response.data;
  } catch (error) {
    PRINT_ERROR(error);
    throw error;
  }
}

export {
  doPostFormCallWithToken,
  doPostCallWithoutToken,
  doDeleteCallWithToken,
  doPatchCallWithToken,
  doPostCallWithToken,
  doGetCallWithToken,
  doPutCallWithToken,
};
