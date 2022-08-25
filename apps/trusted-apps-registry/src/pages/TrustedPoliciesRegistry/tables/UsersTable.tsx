import React, { ReactElement } from "react";
import { Button, Space, Table } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTrustedPoliciesUsersContext } from "../PoliciesUsers.context";
import { config } from "../../../config";

export default function UsersTable(): ReactElement {
  const { users, loading } = useTrustedPoliciesUsersContext();
  const navigate = useNavigate();

  const columns = [
    {
      title: "Id",
      dataIndex: "id",
      index: "id",
    },
    {
      title: "Address",
      dataIndex: "address",
      index: "address",
    },
    {
      title: "Actions",
      render: (prop: { address: string }) => {
        return (
          <Space direction="vertical">
            <Button
              onClick={() => {
                navigate(
                  config.routes.trustedPoliciesRegistryAttributes.replace(
                    ":address",
                    prop.address
                  )
                );
              }}
            >
              <EyeOutlined /> View attributes
            </Button>
          </Space>
        );
      },
    },
  ];
  return (
    <Table rowKey="id" columns={columns} dataSource={users} loading={loading} />
  );
}
