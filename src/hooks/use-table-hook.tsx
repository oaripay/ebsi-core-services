import { Button, Space, Tag, Tooltip, Typography } from "antd";
import React, { useContext } from "react";
import {
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  PropertySafetyOutlined,
} from "@ant-design/icons/lib";

import { AppContext } from "../AppContext";

const { Paragraph } = Typography;

export function useTableHook() {
  const appCtx = useContext(AppContext);

  const columns = [
    {
      title: "Id",
      dataIndex: "id",
      sorter: (a: any, b: any) => {
        return a.name.localeCompare(b.name);
      },
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a: any, b: any) => {
        return a.name.localeCompare(b.name);
      },
    },
    {
      title: "Domain",
      dataIndex: "domain",
      sorter: (a: any, b: any) => {
        return a.name.localeCompare(b.name);
      },
    },
    {
      title: "Public Key",
      dataIndex: "publicKeys",
      key: "publicKeys",
      render: (pubKeys: string[]) => {
        return pubKeys.map((pubKey) => {
          return (
            <Paragraph copyable={{ text: pubKey }} key={pubKey}>
              <Tooltip title={pubKey}>
                <span>{`${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`}</span>
              </Tooltip>
            </Paragraph>
          );
        });
      },
    },
    {
      title: "Authorized apps",
      key: "authorizedApps",
      width: 500,
      render: (params: any) => {
        if (params.authorizedApps) {
          return (
            <Paragraph ellipsis={{ rows: 1, expandable: true, symbol: "More" }}>
              {params.authorizedApps.map((authApp: any) => (
                <Tag
                  className="m-t-10"
                  key={authApp + params.name}
                  color="processing"
                >
                  {authApp}
                </Tag>
              ))}
            </Paragraph>
          );
        }
        return <></>;
      },
    },
    {
      title: "Actions",
      render: (params: any) => {
        return (
          <Space>
            <Tooltip title="Modify authorized apps">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setAuthorizedAppsModal({ show: true, data: params });
                }}
              >
                <LockOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setEditModal({ show: true, data: params });
                }}
              >
                <EditOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Add public key">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setInsertPublicKeyModal({
                    show: true,
                  });
                }}
              >
                <PlusOutlined />
                <KeyOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Add authorization">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setInsertPublicKeyModal({
                    show: true,
                  });
                }}
              >
                <PlusOutlined />
                <PropertySafetyOutlined />
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return { columns };
}
