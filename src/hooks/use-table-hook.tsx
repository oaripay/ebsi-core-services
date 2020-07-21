import {
  Button,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  notification,
} from "antd";
import React, { useContext } from "react";
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
} from "@ant-design/icons/lib";

import { useRegistryContractHook } from "./use-registry-contract.hook";
import { AppContext } from "../AppContext";
import { config } from "../config";

const { confirm } = Modal;

const { Paragraph } = Typography;

export function useTableHook() {
  const appCtx = useContext(AppContext);

  const { deleteApp } = useRegistryContractHook();

  const columns = [
    {
      title: "Id",
      dataIndex: "id",
      sorter: (a: any, b: any) => {
        return parseInt(a.id, 10) - parseInt(b.id, 10);
      },
    },
    {
      title: "Public Key",
      dataIndex: "publicKey",
      key: "publicKey",
      render: (pubKey: string) => {
        return (
          <Paragraph copyable={{ text: pubKey }}>
            <Tooltip title={pubKey}>
              <span>{`${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`}</span>
            </Tooltip>
          </Paragraph>
        );
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
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (code: string) => {
        return (
          <Paragraph copyable={{ text: code }}>
            <Tooltip title={code}>
              <span>{`${code.slice(0, 8)}...${code.slice(-8)}`}</span>
            </Tooltip>
          </Paragraph>
        );
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
            <Tooltip title="Delete">
              <Button
                type="default"
                danger
                onClick={() => {
                  confirm({
                    title: (
                      <div>
                        Are you sure you want to delete{" "}
                        <strong>{params.name}</strong> application ?
                      </div>
                    ),
                    icon: <ExclamationCircleOutlined />,
                    onOk() {
                      notification.info({
                        message: "Transaction",
                        description: (
                          <>
                            <p>
                              A transaction is being sent to wallet. Please go
                              to
                              <a href={config.WALLET_WEB_CLIENT_URL}>
                                {" "}
                                wallet
                              </a>{" "}
                              to sign and broadcast the transaction
                            </p>
                          </>
                        ),
                      });
                      deleteApp(params.name).catch(() => {
                        notification.error({
                          message: "Error",
                          description:
                            "A problem appeared on trying to delete app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
                        });
                      });
                    },
                    onCancel() {},
                  });
                }}
              >
                <DeleteOutlined />
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return { columns };
}
