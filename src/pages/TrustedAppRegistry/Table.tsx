import React, { useEffect } from "react";
import { Table as TableAntd } from "antd";

import { TablePaginationConfig } from "antd/es/table";
import { useTableHook } from "../../hooks/use-table-hook";
import { useAppContext } from "../../AppContext";
import { useRegistryContractHook } from "../../hooks/use-registry-contract.hook";

export function Table() {
  const { columns, loadTableData } = useTableHook();
  const { filteredDataSource, tableLoading, setPage } = useAppContext();
  const { totalItems, initTotalItems } = useRegistryContractHook();

  useEffect(() => {
    initTotalItems();
  }, [initTotalItems]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  return (
    <TableAntd
      dataSource={filteredDataSource}
      columns={columns}
      loading={tableLoading}
      rowKey="id"
      onChange={(changeEvent: TablePaginationConfig) => {
        setPage(changeEvent.current || 1);
      }}
      pagination={{
        position: ["bottomRight"],
        showSizeChanger: false,
        total: totalItems,
        defaultPageSize: 50,
      }}
    />
  );
}
