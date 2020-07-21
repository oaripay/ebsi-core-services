import { BigNumber } from "ethers";
import { useCallback } from "react";

import { useEthersHook } from "./use-ethers.hook";
import { useFetch } from "./use-fetch";
import { config } from "../config";

export function useRegistryContractHook() {
  const { registryContract } = useEthersHook();
  const { post } = useFetch();

  const getApplicationKeys = useCallback(() => {
    return registryContract.getApplicationKeys().then((appKeys: any) => {
      return appKeys.map((appKey: BigNumber) => appKey.toNumber());
    });
  }, []);

  const getApplications = useCallback(() => {
    return getApplicationKeys().then((keys: number[]) => {
      const appsPromises = keys.map((key: number) =>
        registryContract.getApplicationByIndex(key)
      );

      return Promise.all(appsPromises).then((apps) => {
        const authAppsPromises = apps.map((item) =>
          registryContract.getAuthorizedApps(item[0])
        );

        return Promise.all(authAppsPromises).then((authApps) => {
          return authApps.map((authApp, index) => ({
            name: apps[index][0],
            publicKey: apps[index][1],
            code: apps[index][2],
            id: keys[index],
            authorizedApps: authApp,
          }));
        });
      });
    });
  }, []);

  const isOperator = useCallback((): Promise<boolean> => {
    const did: string | null = localStorage.getItem("Did");
    const addr: string[] = did?.split(":") || [];

    if (addr[2]) {
      return registryContract.isOperator(addr[2]);
    }
    return new Promise((resolve) => resolve(false));
  }, []);

  const deleteApp = useCallback((name: string) => {
    return registryContract.populateTransaction
      .deleteApp(name)
      .then((response) => {
        return post(config.NOTIFICATION_URL, {
          did: localStorage.getItem("Did"),
          rawTransaction: {
            to: response.to,
            data: response.data,
          },
          redirectUrl: config.REDIRECT_URL,
          iss: "trusted-app-admin-delete",
        });
      });
  }, []);

  // eslint-disable-next-line no-unused-vars
  const registerApp = useCallback((name: string, pubKey: string) => {
    return registryContract.populateTransaction
      .registerApp(name, pubKey)
      .then((response) => {
        return post(config.NOTIFICATION_URL, {
          did: localStorage.getItem("Did"),
          rawTransaction: {
            to: response.to,
            data: response.data,
          },
          redirectUrl: config.REDIRECT_URL,
          iss: "trusted-app-admin-register",
        });
      });
  }, []);

  const updateApp = useCallback(
    (currName: string, newName: string, pubKey: string) => {
      return registryContract.populateTransaction
        .updateApp(currName, newName, pubKey)
        .then((response) => {
          return post(config.NOTIFICATION_URL, {
            did: localStorage.getItem("Did"),
            rawTransaction: {
              to: response.to,
              data: response.data,
            },
            redirectUrl: config.REDIRECT_URL,
            iss: "trusted-app-admin-update",
          });
        });
    },
    []
  );

  const addNewAuthorization = useCallback(
    (appName: string, authName: string) => {
      return registryContract.populateTransaction
        .addNewAuthorization(appName, authName)
        .then((response) => {
          return post(config.NOTIFICATION_URL, {
            did: localStorage.getItem("Did"),
            rawTransaction: {
              to: response.to,
              data: response.data,
            },
            redirectUrl: config.REDIRECT_URL,
            iss: "trusted-app-admin-add-auth",
          });
        });
    },
    [registryContract]
  );

  const deleteAuthorization = useCallback(
    (appName: string, authName: string) => {
      return registryContract.populateTransaction
        .deleteAuthorization(appName, authName)
        .then((response) => {
          return post(config.NOTIFICATION_URL, {
            did: localStorage.getItem("Did"),
            rawTransaction: {
              to: response.to,
              data: response.data,
            },
            redirectUrl: config.REDIRECT_URL,
            iss: "trusted-app-admin-delete-auth",
          });
        });
    },
    [registryContract]
  );

  return {
    getApplicationKeys,
    getApplications,
    deleteApp,
    registerApp,
    updateApp,
    addNewAuthorization,
    deleteAuthorization,
    isOperator,
  };
}
