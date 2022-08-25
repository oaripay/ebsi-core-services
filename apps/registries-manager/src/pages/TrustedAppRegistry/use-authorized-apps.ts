import { useCallback, useState } from "react";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { PAGE_SIZE } from "./constants";

type DataSourceType = {
  appId: string;
  appName: string;
};

export function useAuthorizedApps() {
  const { registryContract } = useEthersHook();
  const [dataSource, setDataSource] = useState<DataSourceType[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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

  const getAppAuthorizedApps = useCallback(
    (appId: string) => {
      if (!registryContract) {
        return {
          items: [],
          total: 0,
        };
      }
      return registryContract.getAuthorizedAppsIds(appId, page, PAGE_SIZE);
    },
    [page, registryContract]
  );

  const loadTableData = useCallback(
    async (appId: string) => {
      if (!registryContract) {
        return;
      }
      setTableLoading(true);
      const auths = await getAppAuthorizedApps(appId);
      const appNames = await Promise.all(
        auths.items.map((auth: string) =>
          registryContract
            .getAppById(auth)
            .then((app: { name: string }) => app.name)
        )
      );
      setDataSource(
        auths.items.map((id: string, index: number) => ({
          appId: id,
          appName: appNames[index],
        }))
      );
      setTableLoading(false);
    },
    [getAppAuthorizedApps, registryContract]
  );

  const getTotal = useCallback(
    async (appId: string) => {
      if (!registryContract) {
        return 0;
      }
      try {
        const items = await registryContract.getAuthorizedAppsIds(appId, 1, 1);
        return items.total.toNumber();
      } catch (ex) {
        return 0;
      }
    },
    [registryContract]
  );

  const initTotal = useCallback(
    async (appId: string) => {
      setTotal(await getTotal(appId));
    },
    [getTotal]
  );

  return {
    insertAuthorization,
    updateAuthorization,
    getAppAuthorizedApps,
    dataSource,
    tableLoading,
    page,
    setPage,
    total,
    loadTableData,
    initTotal,
  };
}
