import { Alert, Button, Space, Table } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import React, { useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import { useForm } from "antd/es/form/Form";
import { config } from "../../config";
import { PAGE_SIZE } from "../TrustedIssuersRegistry/constants";
import useTrustedSchemasMetadataTable from "./hooks/use-trusted-schemas-metadata-table";
import AddMetadata from "./AddMetadata";
import { useModalContext } from "./Modal.context";
import useTrustedSchemasRegistry from "./hooks/use-trusted-schemas-registry";

export default function TrustedSchemasMetadataTab() {
  const { push } = useHistory();
  const params: { revisionId: string } = useParams();
  const {
    hasErrorLoadingData,
    columns,
    dataSource,
    loading,
    page,
    setPage,
    totalItems,
    loadTableData,
  } = useTrustedSchemasMetadataTable();
  const [form] = useForm();
  const { hideModal } = useModalContext();
  const { updateSchemaMetadataByRevisionId } = useTrustedSchemasRegistry();

  const submit = useCallback(async () => {
    try {
      const fields = await form.validateFields();
      const { schemaRevisionId, metadata } = fields;
      await updateSchemaMetadataByRevisionId(schemaRevisionId, metadata);
      hideModal();
      form.resetFields();
      loadTableData();
    } catch (ex) {
      //
    }
  }, [form, hideModal, loadTableData, updateSchemaMetadataByRevisionId]);

  return (
    <Space direction="vertical">
      <Space>
        <Button onClick={() => push(config.routes.trustedSchemaRegistry)}>
          <LeftOutlined /> Back to schema listing
        </Button>
        <AddMetadata
          form={form}
          submit={submit}
          schemaRevisionId={params.revisionId}
        />
      </Space>
      <h4>
        Revision ID:
        {params.revisionId}
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
