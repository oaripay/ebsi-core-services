import React, { useCallback, useMemo, useState } from "react";
import { Button } from "antd";
import { useHistory } from "react-router-dom";

import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { PAGE_SIZE } from "../constants";
import useTotalTrustedIssuer from "./use-total-trusted-issuer";
import { getReversedValue } from "../../../helpers/pagination";
import { TrustedIssuerDataType } from "../types/TrustedIssuerDataType";
import { config } from "../../../config";

export default function useTrustedIssuersTable() {
  const [dataSource, setDataSource] = useState<TrustedIssuerDataType[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const { trustedIssuersContract } = useEthersHook();
  const { getTotal } = useTotalTrustedIssuer();

  const { push } = useHistory();

  const loadTableData = useCallback(async () => {
    if (!trustedIssuersContract) {
      return;
    }
    setTableLoading(true);
    const total = await getTotal();
    const paginatedResponseData = await trustedIssuersContract
      .getIssuers(getReversedValue(page, PAGE_SIZE, total), PAGE_SIZE)
      .catch(() => ({
        items: [],
        total,
      }));

    setDataSource(
      paginatedResponseData.items.map((item: string) => ({
        did: item,
      }))
    );
    setTotalItems(total);
    setTableLoading(false);
  }, [getTotal, page, trustedIssuersContract]);

  const columns = useMemo(
    () => [
      {
        title: "Issuer DID",
        key: "did",
        dataIndex: "did",
      },
      {
        title: "Actions",
        key: "actions",
        render: ({ did }: { did: string }) => {
          return (
            <Button
              onClick={() =>
                push(`${config.routes.trustedIssuersRegistry}/${did}`)
              }
            >
              Show attributes
            </Button>
          );
        },
      },
    ],
    [push]
  );

  return {
    columns,
    dataSource,
    tableLoading,
    loadTableData,
    totalItems,
    setPage,
    page,
  };
}
