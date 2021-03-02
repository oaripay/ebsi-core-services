import { PopulatedTransaction } from "ethers";
import { useCallback } from "react";

import { useEthersHook } from "./use-ethers.hook";
import { useFetch } from "./use-fetch";
import { config } from "../config";
import { domains } from "../constants";

const PAGE_SIZE = 20;

export function useRegistryContractHook() {
  const { registryContract } = useEthersHook();
  const { post } = useFetch();

  const getApplicationIds = useCallback(() => {
    return registryContract.getApps(1, PAGE_SIZE).then((appKeys: any) => {
      return appKeys.items;
    });
  }, []);

  const insertAppPublicKey = useCallback(
    (
      appId: string,
      publicKey: string,
      status: number,
      notBefore: number,
      notAfter: number
    ) => {
      return registryContract.insertAppPublicKey(
        appId,
        publicKey,
        status,
        notAfter,
        notAfter
      );
    },
    []
  );

  const insertAuthorization = useCallback(
    (
      name: string,
      authorizedAppName: string,
      calldata: string,
      status: number,
      permissions: number,
      notBefore: number,
      notAfter: number
    ) => {
      return registryContract.insertAuthorization(
        name,
        authorizedAppName,
        calldata,
        status,
        permissions,
        notBefore,
        notAfter
      );
    },
    []
  );

  const getApplications = useCallback(() => {
    return getApplicationIds().then((ids: number[]) => {
      const appsPromises = Promise.all(
        ids.map((id: number) => registryContract.getAppById(id))
      );

      const appPublicKeysPromises = Promise.all(
        ids.map((id: number) =>
          registryContract.getAppPublicKeyIds(id, 1, PAGE_SIZE)
        )
      );

      const appAuthorizationsKeysPromises = Promise.all(
        ids.map((id: number) =>
          registryContract.getAuthorizedAppsIds(id, 1, PAGE_SIZE)
        )
      );

      return Promise.allSettled([
        appsPromises,
        appPublicKeysPromises,
        appAuthorizationsKeysPromises,
      ]).then((result) => {
        const apps: any = result[0];
        const appPublicKeys: any = result[1];
        const appAuthorizations: any = result[2];

        const tableData = [];

        for (let i = 0; i < apps.value.length; i += 1) {
          tableData.push({
            id: ids[i],
            name: apps.value[i].name,
            domain: domains[apps.value[i].domain],
            publicKeys: appPublicKeys.value[i].items,
            authorizedApps: appAuthorizations.value[i].items,
          });
        }
        return tableData;
      });
    });
  }, []);

  const isOperator = useCallback((): Promise<boolean> => {
    const did: string | null = localStorage.getItem("Did");
    const addr: string[] = did?.split(":") || [];

    if (addr[2]) {
      return registryContract?.isOperator(addr[2]);
    }
    return new Promise((resolve) => resolve(false));
  }, []);

  // eslint-disable-next-line no-unused-vars
  const registerApp = useCallback(
    (
      name: string,
      domain: number,
      appAdministrator: string,
      pubKey: string,
      status: number,
      notBefore: number,
      notAfter: number
    ) => {
      return registryContract
        .insertApp(
          name,
          domain,
          appAdministrator,
          pubKey,
          status,
          notBefore,
          notAfter
        )
        .then(() => {
          // console.log(data);
        })
        .catch(() => {
          // console.log(er);
        });
    },
    []
  );

  const updateApp = useCallback(
    (currName: string, newName: string, pubKey: string) => {
      return registryContract.populateTransaction
        .updateApp(currName, newName, pubKey)
        .then((response: PopulatedTransaction) => {
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

  const deleteAuthorization = useCallback(
    (appName: string, authName: string) => {
      return registryContract.populateTransaction
        .deleteAuthorization(appName, authName)
        .then((response: PopulatedTransaction) => {
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
    getApplications,
    registerApp,
    updateApp,
    deleteAuthorization,
    isOperator,
    insertAppPublicKey,
    insertAuthorization,
  };
}
