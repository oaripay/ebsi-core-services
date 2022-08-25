import { Button, Space, Tooltip } from "antd";
import React, { useCallback } from "react";
import { EditOutlined } from "@ant-design/icons/lib";
import { useNavigate } from "react-router-dom";

import { useAppContext } from "../../AppContext";
import { useTrustedAppHook } from "./use-trusted-app.hook";
import { config } from "../../config";

export function useTableHook() {
  const {
    setTableLoading,
    searchedTerm,
    setTableDataSource,
    setSearchedTerm,
    setEditModal,
  } = useAppContext();
  const { getApplications } = useTrustedAppHook();
  const navigate = useNavigate();

  const loadTableData = useCallback(() => {
    if (!searchedTerm) {
      setTableLoading(true);
      getApplications().then((data: any) => {
        setTableDataSource(data.tableData);
      });
    }
  }, [getApplications, searchedTerm, setTableDataSource, setTableLoading]);

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
      title: "Actions",
      render: (params: any) => {
        return (
          <Space>
            <Button
              onClick={() => {
                navigate(
                  config.routes.trustedAppsRegistryPublicKeys.replace(
                    ":id",
                    params.id
                  )
                );
              }}
            >
              Show public keys
            </Button>
            <Button
              onClick={() => {
                navigate(
                  config.routes.trustedAppsRegistryAuthorizations.replace(
                    ":id",
                    params.id
                  )
                );
              }}
            >
              Show authorizations
            </Button>
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
