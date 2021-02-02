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

import { AppContext } from "../AppContext";

const { confirm } = Modal;

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
                            <p>A transaction has been broadcasted.</p>
                          </>
                        ),
                      });
                      // deleteApp(params.name).catch(() => {
                      //   notification.error({
                      //     message: "Error",
                      //     description:
                      //       "A problem appeared on trying to delete app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
                      //   });
                      // });
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
