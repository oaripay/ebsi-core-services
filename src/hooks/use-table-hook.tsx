import { Button, Space, Tag, Tooltip, Typography } from "antd";
import React, { useCallback, useContext } from "react";
import {
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  PropertySafetyOutlined,
} from "@ant-design/icons/lib";

import { AppContext } from "../AppContext";
import { useRegistryContractHook } from "./use-registry-contract.hook";

const { Paragraph } = Typography;

export function useTableHook() {
  const appCtx = useContext(AppContext);
  const { getApplications } = useRegistryContractHook();

  const loadTableData = useCallback(() => {
    appCtx.setTableLoading(true);
    getApplications().then((data: any) => {
      appCtx.setTableDataSource(data);
    });
  }, [getApplications, appCtx.page]);

  const columns = [
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
        if (params.authorizedApps.length) {
          return (
            <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: "More" }}>
              {params.authorizedApps.map((authApp: any) => (
                <Tag className="m-t-10" key={authApp} color="processing">
                  {
                    appCtx.filteredDataSource.find(
                      (param: any) => param.id === authApp
                    ).name
                  }
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
            <Tooltip title="Add public key">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setInsertPublicKeyModal({
                    show: true,
                    appId: params.id,
                  });
                }}
              >
                <PlusOutlined />
                <KeyOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Update public key">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setUpdateAppPublicKey({
                    show: true,
                    data: {
                      publicKeys: params.publicKeys,
                      status: params.status,
                      id: params.id,
                      name: params.name,
                    },
                  });
                }}
              >
                <EditOutlined />
                <KeyOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Add authorization">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setAuthorizedAppsModal({
                    show: true,
                    data: {
                      name: params.name,
                    },
                  });
                }}
              >
                <PlusOutlined />
                <PropertySafetyOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Update authorization">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setUpdateAuthorization({
                    show: true,
                    data: {
                      appId: params.id,
                      authorizedApps: params.authorizedApps,
                    },
                  });
                }}
              >
                <EditOutlined />
                <PropertySafetyOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Update app">
              <Button
                type="default"
                onClick={() => {
                  appCtx.setEditModal({
                    show: true,
                    data: {
                      domain: params.domain,
                      id: params.id,
                      name: params.name,
                    },
                  });
                }}
              >
                <EditOutlined />
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return { columns, loadTableData };
}
