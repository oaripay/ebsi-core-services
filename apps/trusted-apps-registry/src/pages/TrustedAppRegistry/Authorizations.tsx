import React, { ReactElement, useEffect, useMemo } from "react";
import { Button, Row, Space, Table, Tooltip } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import {
  EditOutlined,
  LeftOutlined,
  PlusOutlined,
  PropertySafetyOutlined,
} from "@ant-design/icons";
import { useAuthorizedApps } from "./use-authorized-apps";
import { PAGE_SIZE } from "../TrustedIssuersRegistry/constants";
import InfoCard from "./InfoCard";
import { config } from "../../config";
import { useAppContext } from "../../AppContext";
import { ModalUpdateAuthorization } from "./modals/ModalUpdateAuthorization";
import ModalInsertAuth from "./modals/ModalInsertAuth";

export default function Authorizations(): ReactElement {
  const {
    total,
    dataSource,
    tableLoading,
    page,
    setPage,
    loadTableData,
    initTotal,
  } = useAuthorizedApps();

  const { setAuthorizedAppsModal, setUpdateAuthorization } = useAppContext();

  const { id } = useParams();

  const columns = useMemo(() => {
    return [
      {
        title: "App id",
        dataIndex: "appId",
      },

      {
        title: "App name",
        dataIndex: "appName",
      },
      {
        title: "Actions",
        render: (params: { appId: string; appName: string }) => {
          return (
            <Space>
              <Tooltip title="Add authorization">
                <Button
                  type="default"
                  onClick={() => {
                    setAuthorizedAppsModal({
                      show: true,
                      data: {
                        name: params.appId,
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
                        appId: params.appId,
                        authorizedApps: dataSource.map((item) => item.appId),
                      },
                    });
                  }}
                >
                  <EditOutlined />
                  <PropertySafetyOutlined />
                </Button>
              </Tooltip>
            </Space>
          );
        },
      },
    ];
  }, [dataSource, setAuthorizedAppsModal, setUpdateAuthorization]);

  useEffect(() => {
    loadTableData(id);
    initTotal(id);
  }, [id, initTotal, loadTableData]);
  const navigate = useNavigate();

  return (
    <Space direction="vertical" size="middle" className="content-container">
      <ModalUpdateAuthorization />
      <ModalInsertAuth />
      <InfoCard />
      <Row justify="space-between">
        <Button onClick={() => navigate(config.routes.trustedAppsRegistry)}>
          <LeftOutlined />
          Back to listing
        </Button>
      </Row>
      <Table
        key="publicKey"
        columns={columns}
        dataSource={dataSource}
        loading={tableLoading}
        pagination={{
          onChange: (pageNr: number) => {
            setPage(pageNr);
          },
          showSizeChanger: false,
          pageSize: PAGE_SIZE,
          current: page,
          position: ["bottomCenter"],
          total,
        }}
      />
    </Space>
  );
}
