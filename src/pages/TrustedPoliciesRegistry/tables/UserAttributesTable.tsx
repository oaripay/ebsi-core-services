import React, { ReactElement } from "react";
import { Button, Popconfirm, Space, Table } from "antd";
import { EditOutlined, MinusOutlined } from "@ant-design/icons";
import { useTrustedPoliciesUsersContext } from "../PoliciesUsers.context";
import useUserAttributes from "../useUserAttributes";
import EditUserAttributeForm from "../modal/EditUserAttributeForm";

export default function UserAttributesTable({
  address,
}: {
  address: string;
}): ReactElement {
  const { attributes, attributesLoading } = useTrustedPoliciesUsersContext();
  const {
    deleteAttribute,
    showEditUserAttrModal,
    editAttributeForm,
    isShowEditUserAttrModal,
    hideEditUserAttrModal,
    editAttribute,
  } = useUserAttributes();

  const columns = [
    {
      title: "Id",
      dataIndex: "id",
      index: "id",
    },
    {
      title: "Name",
      dataIndex: "name",
      index: "name",
    },
    {
      title: "Value",
      dataIndex: "value",
      index: "value",
    },
    {
      title: "Actions",
      render: (prop: { name: string; value: string }) => {
        return (
          <Space direction="vertical">
            <Popconfirm
              placement="top"
              title="Are you sure you want to delete attribute ?"
              onConfirm={async () => {
                await deleteAttribute(address, prop.name);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button danger>
                <MinusOutlined />
                Delete attribute
              </Button>
            </Popconfirm>
            <Button
              onClick={() => {
                showEditUserAttrModal();
                editAttributeForm.setFieldsValue({
                  attribute: prop.name,
                  address,
                  value: prop.value,
                });
              }}
            >
              <EditOutlined />
              Edit attribute
            </Button>
          </Space>
        );
      },
    },
  ];
  return (
    <>
      <EditUserAttributeForm
        form={editAttributeForm}
        show={isShowEditUserAttrModal}
        hideModal={hideEditUserAttrModal}
        submit={editAttribute}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={attributes}
        loading={attributesLoading}
      />
    </>
  );
}
