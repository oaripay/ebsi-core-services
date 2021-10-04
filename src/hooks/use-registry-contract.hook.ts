import { BigNumber } from "ethers";
import { useCallback, useState } from "react";

import { useEthersHook } from "./use-ethers.hook";
import { domains } from "../constants";
import { useAppContext } from "../AppContext";
import { config } from "../config";

const { PAGE_SIZE } = config;

export function useRegistryContractHook() {
  const { registryContract } = useEthersHook();
  const { page } = useAppContext();

  const [totalItems, setTotalItems] = useState(0);

  const getApplicationIds = useCallback(() => {
    if (!registryContract) {
      return {
        total: BigNumber.from(0),
        items: [],
      };
    }
    return registryContract.getApps(page, PAGE_SIZE).catch(() => {
      return {
        total: BigNumber.from(0),
        items: [],
      };
    });
  }, [registryContract, page]);

  const insertAppPublicKey = useCallback(
    (
      appId: string,
      publicKey: string,
      status: number,
      notBefore: number,
      notAfter: number
    ) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.insertAppPublicKey(
        appId,
        publicKey,
        status,
        notAfter,
        notAfter
      );
    },
    [registryContract]
  );

  const insertAuthorization = useCallback(
    (
      name: string,
      authorizedAppName: string,
      iss: string,
      status: number,
      permissions: number,
      notBefore: number,
      notAfter: number
    ) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.insertAuthorization(
        name,
        authorizedAppName,
        iss,
        status,
        permissions,
        notBefore,
        notAfter
      );
    },
    [registryContract]
  );

  const initTotalItems = useCallback(() => {
    return getApplicationIds().then(
      (applications: { items: number[]; total: BigNumber }) => {
        setTotalItems(applications.total.toNumber());
      }
    );
  }, [getApplicationIds]);

  const getAppByName = useCallback(
    (appName: string) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.getAppByName(appName);
    },
    [registryContract]
  );

  const getAuthorizationsIds = useCallback(
    (applicationId: string, authorizedAppId: string) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract
        .getAuthorizations(applicationId, authorizedAppId, 1, PAGE_SIZE)
        .then((authIdsResponse: { items: number[]; total: BigNumber }) => {
          return authIdsResponse.items;
        });
    },
    [registryContract]
  );

  const getAllMissingAppsByAuthorizationIds = (
    idsLocally: any,
    appAuthorizations: any,
    length: number
  ) => {
    const appIdsLocally: string[] = [];
    for (let i = 0; i < length; i += 1) {
      for (let j = 0; j < appAuthorizations.value[i].items.length; j += 1) {
        const authorizationIdLocally = appAuthorizations.value[i].items[j];
        if (
          !appIdsLocally.includes(authorizationIdLocally) &&
          !idsLocally.includes(authorizationIdLocally)
        ) {
          appIdsLocally.push(authorizationIdLocally);
        }
      }
    }
    return appIdsLocally;
  };

  const getApplications = useCallback(
    (appIds = null) => {
      if (!registryContract) {
        return [];
      }
      let promise = getApplicationIds();
      if (appIds) {
        promise = Promise.resolve({
          items: appIds,
          total: 1,
        });
      }
      return promise.then(
        (applications: { items: number[]; total: number }) => {
          const ids = applications.items;
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
            return {
              tableData,
              missingAppsFromTable: getAllMissingAppsByAuthorizationIds(
                ids,
                appAuthorizations,
                apps.value.length
              ),
            };
          });
        }
      );
    },
    [getApplicationIds, registryContract]
  );

  const isOperator = useCallback((): Promise<boolean> => {
    const did: string | null = localStorage.getItem("Did");
    const addr: string[] = did?.split(":") || [];

    if (addr[2]) {
      return registryContract?.isOperator(addr[2]);
    }
    return new Promise((resolve) => resolve(false));
  }, [registryContract]);

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
      if (!registryContract) {
        return undefined;
      }
      return registryContract.insertApp(
        name,
        domain,
        appAdministrator,
        pubKey,
        status,
        notBefore,
        notAfter
      );
    },
    [registryContract]
  );

  const updateApp = useCallback(
    (applicationId, name, domain) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.updateApp(applicationId, name, domain);
    },
    [registryContract]
  );

  const updateAppPublicKey = useCallback(
    (publicKeyId, status, notAfter) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.updateAppPublicKey(publicKeyId, status, notAfter);
    },
    [registryContract]
  );

  const updateAuthorization = useCallback(
    (authorizationId, status, permissions, notAfter) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.updateAuthorization(
        authorizationId,
        status,
        permissions,
        notAfter
      );
    },
    [registryContract]
  );

  return {
    getApplications,
    registerApp,
    updateApp,
    isOperator,
    insertAppPublicKey,
    insertAuthorization,
    updateAppPublicKey,
    updateAuthorization,
    getAuthorizationsIds,
    totalItems,
    initTotalItems,
    getAppByName,
    getAllMissingAppsByAuthorizationIds,
  };
}
