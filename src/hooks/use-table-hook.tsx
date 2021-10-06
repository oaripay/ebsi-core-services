import { Button, Row, Space, Tag, Tooltip, Typography } from "antd";
import React, { useCallback } from "react";
import {
  EditOutlined,
  PlusOutlined,
  PropertySafetyOutlined,
} from "@ant-design/icons/lib";

import { useAppContext } from "../AppContext";
import { useRegistryContractHook } from "./use-registry-contract.hook";
import Ellipsis from "../components/Ellipsis/Ellipsis";

const { Paragraph } = Typography;

export function useTableHook() {
  const {
    setTableLoading,
    searchedTerm,
    setTableDataSource,
    setMissingApps,
    setSearchedTerm,
    tableDataSource,
    missingApps,
    setInsertPublicKeyModal,
    setUpdateAppPublicKey,
    setAuthorizedAppsModal,
    setUpdateAuthorization,
    setEditModal,
  } = useAppContext();
  const { getApplications } = useRegistryContractHook();

  const loadTableData = useCallback(() => {
    if (!searchedTerm) {
      setTableLoading(true);
      getApplications().then((data: any) => {
        setTableDataSource(data.tableData);
        getApplications(data.missingAppsFromTable).then(
          (newMissingApps: any) => {
            setMissingApps(newMissingApps.tableData);
          }
        );
      });
    }
  }, [
    getApplications,
    searchedTerm,
    setMissingApps,
    setTableDataSource,
    setTableLoading,
  ]);

  const resetTableData = useCallback(() => {
    setTableDataSource([]);
    setSearchedTerm("");
  }, [setSearchedTerm, setTableDataSource]);

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
      render: (params: any) => {
        const { publicKeys } = params;
        return (
          <>
            {publicKeys.map((pubKey: string) => {
              return (
                <div key={pubKey}>
                  <Row align="middle">
                    <Paragraph copyable={{ text: pubKey }} key={pubKey}>
                      <Tooltip title={pubKey}>
                        <span>{`${pubKey.slice(0, 8)}...${pubKey.slice(
                          -8
                        )}`}</span>
                      </Tooltip>
                    </Paragraph>
                    <Paragraph>
                      <Button
                        title="Update an existing public key"
                        type="link"
                        className="m-l-4 p-0"
                        onClick={() => {
                          setUpdateAppPublicKey({
                            show: true,
                            data: {
                              publicKey: pubKey,
                              status: params.status,
                              id: params.id,
                              name: params.name,
                            },
                          });
                        }}
                      >
                        <EditOutlined />
                      </Button>
                    </Paragraph>
                  </Row>
                </div>
              );
            })}
            <Row>
              <Button
                type="link"
                className="p-0"
                onClick={() => {
                  setInsertPublicKeyModal({
                    show: true,
                    data: {
                      appId: params.id,
                    },
                  });
                }}
              >
                <PlusOutlined />
                Add a new key
              </Button>
            </Row>
          </>
        );
      },
    },
    {
      title: "Authorized apps",
      key: "authorizedApps",
      width: 500,
      render: (params: any) => {
        const { authorizedApps } = params;
        if (authorizedApps.length) {
          return (
            <Ellipsis>
              {params.authorizedApps.map((authApp: any) => {
                let name = tableDataSource.find(
                  (param: any) => param.id === authApp
                )?.name;
                if (!name) {
                  name = missingApps.find(
                    (param: any) => param.id === authApp
                  )?.name;
                }
                return (
                  <Tag className="m-t-10" key={authApp} color="processing">
                    {name}
                  </Tag>
                );
              })}
            </Ellipsis>
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
            <Tooltip title="Add authorization">
              <Button
                type="default"
                onClick={() => {
                  setAuthorizedAppsModal({
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
            <Tooltip title="Update an existing authorization">
              <Button
                type="default"
                onClick={() => {
                  setUpdateAuthorization({
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
                  setEditModal({
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

  return { columns, loadTableData, resetTableData };
}
