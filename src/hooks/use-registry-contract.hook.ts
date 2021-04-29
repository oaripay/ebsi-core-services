import { BigNumber } from "ethers";
import { useCallback, useContext, useState } from "react";

import { useEthersHook } from "./use-ethers.hook";
import { domains } from "../constants";
import { AppContext } from "../AppContext";
import { config } from "../config";

const { PAGE_SIZE } = config;

export function useRegistryContractHook() {
  const { registryContract } = useEthersHook();
  const appCtx = useContext(AppContext);

  const [totalItems, setTotalItems] = useState(0);

  const getApplicationIds = useCallback(() => {
    return registryContract.getApps(appCtx.page, PAGE_SIZE);
  }, [registryContract, appCtx.page]);

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
      iss: string,
      status: number,
      permissions: number,
      notBefore: number,
      notAfter: number
    ) => {
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
    []
  );

  const initTotalItems = useCallback(() => {
    return getApplicationIds().then(
      (applications: { items: number[]; total: BigNumber }) => {
        setTotalItems(applications.total.toNumber());
      }
    );
  }, []);

  const getAppByName = useCallback((appName: string) => {
    return registryContract.getAppByName(appName);
  }, []);

  const getAuthorizationsIds = useCallback(
    (applicationId: string, authorizedAppId: string) => {
      return registryContract
        .getAuthorizations(applicationId, authorizedAppId, 1, PAGE_SIZE)
        .then((authIdsResponse: { items: number[]; total: BigNumber }) => {
          return authIdsResponse.items;
        });
    },
    []
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
    [getApplicationIds, appCtx.page]
  );

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
    []
  );

  const updateApp = useCallback((applicationId, name, domain) => {
    return registryContract.updateApp(applicationId, name, domain);
  }, []);

  const updateAppPublicKey = useCallback((publicKeyId, status, notAfter) => {
    return registryContract.updateAppPublicKey(publicKeyId, status, notAfter);
  }, []);

  const updateAuthorization = useCallback(
    (authorizationId, status, permissions, notAfter) => {
      return registryContract.updateAuthorization(
        authorizationId,
        status,
        permissions,
        notAfter
      );
    },
    []
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
