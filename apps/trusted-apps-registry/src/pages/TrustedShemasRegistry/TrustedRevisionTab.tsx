import React, { ReactElement, useCallback } from "react";
import { Alert, Button, Space, Table } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { LeftOutlined } from "@ant-design/icons";
import { useForm } from "antd/es/form/Form";

import useTrustedSchemasRevisionTable from "./hooks/use-trusted-schemas-revision-table";
import { PAGE_SIZE } from "../TrustedIssuersRegistry/constants";
import { config } from "../../config";
import AddRevision from "./AddRevision";
import useTrustedSchemasRegistry from "./hooks/use-trusted-schemas-registry";
import { useModalContext } from "./Modal.context";

export default function TrustedRevisionTab(): ReactElement {
  const {
    columns,
    dataSource,
    totalItems,
    loading,
    hasErrorLoadingData,
    setPage,
    page,
    loadTableData,
  } = useTrustedSchemasRevisionTable();
  const navigate = useNavigate();
  const params: { schemaId: string } = useParams();
  const [form] = useForm();
  const { updateSchema } = useTrustedSchemasRegistry();
  const { hideModal } = useModalContext();

  const submit = useCallback(async () => {
    try {
      const fields = await form.validateFields();
      const { schemaId, schema, metadata } = fields;
      await updateSchema(schemaId, schema, metadata);
      hideModal();
      form.resetFields();
      loadTableData();
    } catch (ex) {
      //
    }
  }, [form, updateSchema, hideModal, loadTableData]);

  return (
    <Space direction="vertical">
      <Space>
        <Button onClick={() => navigate(config.routes.trustedSchemaRegistry)}>
          <LeftOutlined /> Back to schema listing
        </Button>
        <AddRevision form={form} submit={submit} schemaId={params.schemaId} />
      </Space>
      <h4>
        Schema ID:
        {params.schemaId}
      </h4>
      {hasErrorLoadingData ? (
        <Alert
          message="An error appeared while loading data"
          type="error"
          showIcon
        />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
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
      )}
    </Space>
  );
}
