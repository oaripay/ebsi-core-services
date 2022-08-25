import React, { ReactElement, useEffect, useMemo } from "react";
import { Button, Col, Row, Space, Table } from "antd";
import { useHistory, useParams } from "react-router-dom";
import { EditOutlined, LeftOutlined, PlusOutlined } from "@ant-design/icons";
import { PAGE_SIZE } from "../TrustedIssuersRegistry/constants";
import { useTrustedAppPublicKeysHook } from "./use-trusted-app-public-keys.hook";
import { useAppContext } from "../../AppContext";
import { config } from "../../config";
import InfoCard from "./InfoCard";

export default function PublicKeys(): ReactElement {
  const {
    total,
    dataSource,
    tableLoading,
    page,
    setPage,
    loadTableData,
    initTotal,
    getAppDetails,
  } = useTrustedAppPublicKeysHook();

  const { id } = useParams();

  const { push } = useHistory();

  useEffect(() => {
    loadTableData(id);
    initTotal(id);
  }, [id, initTotal, loadTableData]);

  const { setInsertPublicKeyModal, setUpdateAppPublicKey } = useAppContext();

  const columns = useMemo(
    () => [
      {
        title: "Public key",
        key: "publicKey",
        dataIndex: "publicKey",
      },
      {
        title: "Actions",
        key: "actions",
        render: (data: { publicKey: string }) => {
          return (
            <>
              <Button
                title="Update an existing public key"
                type="link"
                className="m-l-4 p-0"
                onClick={async () => {
                  const details = await getAppDetails(id);
                  setUpdateAppPublicKey({
                    show: true,
                    data: {
                      publicKey: data.publicKey,
                      id,
                      name: details.name,
                    },
                  });
                }}
              >
                <EditOutlined />
              </Button>
            </>
          );
        },
      },
    ],
    [getAppDetails, id, setUpdateAppPublicKey]
  );
  return (
    <Space direction="vertical" size="middle" className="content-container">
      <InfoCard />
      <Row justify="space-between">
        <Button onClick={() => push(config.routes.trustedAppsRegistry)}>
          <LeftOutlined />
          Back to listing
        </Button>
      </Row>
      <Row>
        <Col>
          <Button
            type="primary"
            onClick={() => {
              setInsertPublicKeyModal({
                show: true,
                data: {
                  appId: id,
                },
              });
            }}
          >
            <PlusOutlined />
            Add a new key
          </Button>
        </Col>
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
