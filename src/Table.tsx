import React, { useContext, useEffect } from "react";
import { Table as TableAntd } from "antd";

import { useTableHook } from "./hooks/use-table-hook";
import { AppContext } from "./AppContext";
import { useRegistryContractHook } from "./hooks/use-registry-contract.hook";

export function Table() {
  const { columns } = useTableHook();
  const appCtx = useContext(AppContext);

  const { getApplications } = useRegistryContractHook();

  useEffect(() => {
    if (!appCtx.tableDataSource.length) {
      getApplications().then((data: any) => {
        appCtx.setTableDataSource(data);
      });
    }
  }, []);

  return (
    <TableAntd
      dataSource={appCtx.filteredDataSource}
      columns={columns}
      loading={appCtx.tableLoading}
      rowKey="id"
    />
  );
}
