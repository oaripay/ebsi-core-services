import { useCallback, useState } from "react";
import BigNumber from "bn.js";
import { useEthersHook } from "../../hooks/use-ethers.hook";
import { PAGE_SIZE } from "../TrustedIssuersRegistry/constants";
import { PaginatedResponseType } from "../../shared/PaginatedResponseType";

export function useTrustedAppPublicKeysHook() {
  const { registryContract } = useEthersHook();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dataSource, setDataSource] = useState<{ publicKey: string }[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  const getTotal = useCallback(
    async (appId: string) => {
      if (!registryContract) {
        return [];
      }
      try {
        const response = await registryContract.getAppPublicKeyIds(appId, 1, 1);
        return response.total.toNumber();
      } catch (ex) {
        return 0;
      }
    },
    [registryContract]
  );

  const initTotal = useCallback(
    async (appId: string) => {
      const nrOfItems = await getTotal(appId);
      setTotal(nrOfItems);
    },
    [getTotal]
  );

  const getAppDetails = useCallback(
    (appId: string) => {
      if (!registryContract) {
        return {};
      }
      return registryContract.getAppById(appId);
    },
    [registryContract]
  );

  const getPublicKeys = useCallback(
    async (appId: string): Promise<PaginatedResponseType> => {
      if (!registryContract) {
        return {
          total: new BigNumber(0),
          howMany: new BigNumber(0),
          items: [],
        };
      }
      try {
        return await registryContract.getAppPublicKeyIds(
          appId,
          page,
          PAGE_SIZE
        );
      } catch (ex) {
        return {
          total: new BigNumber(0),
          howMany: new BigNumber(0),
          items: [],
        };
      }
    },
    [page, registryContract]
  );

  const loadTableData = useCallback(
    async (appId: string) => {
      setTableLoading(true);
      const publicKeys = await getPublicKeys(appId);
      setDataSource(
        publicKeys.items.map((publicKey: string) => ({ publicKey }))
      );
      setTableLoading(false);
    },
    [getPublicKeys]
  );

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

  const updateAppPublicKey = useCallback(
    (publicKeyId, status, notAfter) => {
      if (!registryContract) {
        return undefined;
      }
      return registryContract.updateAppPublicKey(publicKeyId, status, notAfter);
    },
    [registryContract]
  );

  return {
    getPublicKeys,
    page,
    setPage,
    initTotal,
    total,
    dataSource,
    loadTableData,
    tableLoading,
    getAppDetails,
    insertAppPublicKey,
    updateAppPublicKey,
  };
}
