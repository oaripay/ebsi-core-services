import axios from "axios";
import { config } from "../config";

export const useFetch = () => {
  const axiosInstance = axios.create({
    baseURL: config.EBSI_API,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("Jwt")}`,
    },
  });
  return {
    get: axiosInstance.get,
    post: axiosInstance.post,
    patch: axiosInstance.patch,
    put: axiosInstance.put,
  };
};
