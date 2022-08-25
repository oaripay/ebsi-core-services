import React, { ReactElement, useEffect } from "react";
import { Table } from "antd";
import useTrustedIssuersTable from "./hooks/use-trusted-issuers-table";
import { PAGE_SIZE } from "./constants";

export default function TrustedTable(): ReactElement {
  const {
    columns,
    dataSource,
    tableLoading,
    loadTableData,
    totalItems,
    page,
    setPage,
  } = useTrustedIssuersTable();

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  return (
    <Table
      key="did"
      columns={columns}
      dataSource={dataSource}
      loading={tableLoading}
      pagination={{
        onChange: (pageNr: number) => {
          setPage(pageNr);
        },
        showSizeChanger: false,
        pageSize: PAGE_SIZE,
        current: page,
        position: ["bottomCenter"],
        total: totalItems,
      }}
    />
  );
}
