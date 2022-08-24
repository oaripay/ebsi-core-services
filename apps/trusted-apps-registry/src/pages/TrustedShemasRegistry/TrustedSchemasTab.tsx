import React, { ReactElement, useCallback } from "react";
import { Space, Table } from "antd";

import { useForm } from "antd/es/form/Form";
import useTrustedSchemasRegistryTable from "./hooks/use-trusted-schemas-registry-table";
import { PAGE_SIZE } from "../TrustedIssuersRegistry/constants";
import InsertSchema from "./InsertSchema";
import useTrustedSchemasRegistry from "./hooks/use-trusted-schemas-registry";
import { useModalContext } from "./Modal.context";

export default function TrustedSchemaTable(): ReactElement {
  const {
    columns,
    loading,
    setPage,
    page,
    totalItems,
    dataSource,
    loadTableData,
  } = useTrustedSchemasRegistryTable();
  const { insertSchema } = useTrustedSchemasRegistry();
  const { hideModal } = useModalContext();
  const [form] = useForm();

  const submit = useCallback(async () => {
    try {
      const fields = await form.validateFields();
      const { schemaId, schema, metadata } = fields;
      await insertSchema(schemaId, schema, metadata);
      hideModal();
      form.resetFields();
      loadTableData();
    } catch (ex) {
      //
    }
  }, [form, hideModal, insertSchema, loadTableData]);

  return (
    <Space direction="vertical">
      <InsertSchema form={form} submit={submit} />
      <Table
        rowKey="id"
        columns={columns}
        loading={loading}
        dataSource={dataSource}
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
    </Space>
  );
}
