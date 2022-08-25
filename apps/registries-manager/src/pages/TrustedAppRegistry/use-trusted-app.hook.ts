import { BigNumber } from "ethers";
import { useCallback, useState } from "react";

import { useEthersHook } from "../../hooks/use-ethers.hook";
import { domains } from "../../constants";
import { useAppContext } from "../../AppContext";
import { config } from "../../config";
import { getReversedValue } from "../../helpers/pagination";
import { PaginatedResponseType } from "../../shared/PaginatedResponseType";

const { PAGE_SIZE } = config;

export function useTrustedAppHook() {
  const { registryContract } = useEthersHook();
  const { page } = useAppContext();

  const [totalItems, setTotalItems] = useState(0);

  const getTotal = useCallback(async () => {
    if (!registryContract) {
      return 0;
    }
    return registryContract
      .getApps(1, 1)
      .then((response: PaginatedResponseType) => {
        return response.total.toNumber();
      })
      .catch(() => 0);
  }, [registryContract]);

  const getApplicationIds = useCallback(async () => {
    if (!registryContract) {
      return {
        total: BigNumber.from(0),
        items: [],
      };
    }
    const total = await getTotal();
    return registryContract
      .getApps(getReversedValue(page, PAGE_SIZE, total), PAGE_SIZE)
      .catch(() => {
        return {
          total: BigNumber.from(0),
          items: [],
        };
      });
  }, [registryContract, getTotal, page]);

  const initTotalItems = useCallback(async () => {
    setTotalItems(await getTotal());
  }, [getTotal]);

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
        .then((authIdsResponse: PaginatedResponseType) => {
          return authIdsResponse.items;
        });
    },
    [registryContract]
  );

  const getApplications = useCallback(
    async (appIds = null) => {
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

          return Promise.allSettled([appsPromises]).then((result) => {
            const apps: any = result[0];
            const tableData = [];

            for (let i = 0; i < apps.value.length; i += 1) {
              tableData.push({
                id: ids[i],
                name: apps.value[i].name,
                domain: domains[apps.value[i].domain],
                authorizedApps: [],
              });
            }
            return {
              tableData,
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

  return {
    getApplications,
    registerApp,
    updateApp,
    isOperator,
    getAuthorizationsIds,
    totalItems,
    initTotalItems,
    getAppByName,
    getTotal,
  };
}
