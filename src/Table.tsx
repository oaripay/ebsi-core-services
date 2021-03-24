import React, { useContext, useEffect } from "react";
import { Table as TableAntd } from "antd";

import { useTableHook } from "./hooks/use-table-hook";
import { AppContext } from "./AppContext";
import { useRegistryContractHook } from "./hooks/use-registry-contract.hook";

export function Table() {
  const { columns, loadTableData } = useTableHook();
  const appCtx = useContext(AppContext);

  const { getApplications } = useRegistryContractHook();

  useEffect(() => {
    loadTableData();
  }, [getApplications, appCtx.page]);

  return (
    <TableAntd
      dataSource={appCtx.filteredDataSource}
      columns={columns}
      loading={appCtx.tableLoading}
      rowKey="id"
      pagination={{
        position: ["bottomRight"],
        pageSizeOptions: ["10", "20", "25", "30", "35", "40"],
        showSizeChanger: true,
      }}
    />
  );
}
