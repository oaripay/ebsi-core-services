import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { Button, Space, Table } from "antd";
import { LeftOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Paragraph from "antd/es/typography/Paragraph";
import { PAGE_SIZE } from "./constants";
import useTrustedIssuersAttributesTable from "./hooks/use-trusted-issuers-attributes-table";
import AddAttributeHashModal from "./AddAttributeHashModal";
import AddAttributeRevisionModal from "./AddAttributeRevisionModal";
import {
  ModalAttributeType,
  ModalRevisionType,
} from "./types/ModalAttributeType";
import { config } from "../../config";

type PropType = {
  did: string;
};

export default function TrustedIssuerAttributes(props: PropType): ReactElement {
  const { did } = props;
  const {
    tableLoading,
    dataSource,
    setPage,
    page,
    total,
    initTotal,
    loadAttributesWithRevision,
  } = useTrustedIssuersAttributesTable();

  const [modalAttribute, setAttributeModal] = useState<ModalAttributeType>({
    show: false,
    did: "",
  });

  const [modalRevision, setModalRevision] = useState<ModalRevisionType>({
    show: false,
    did: "",
    attribute: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    initTotal(did);
    loadAttributesWithRevision(did);
  }, [did, initTotal, loadAttributesWithRevision]);

  const columns = useMemo(
    () => [
      {
        title: "Attribute(s) data",
        key: "attributeData",
        dataIndex: "attributeData",
      },
      {
        title: "Revisions",
        key: "revisions",
        dataIndex: "revisions",
        render: (revisions: string[]) => {
          return revisions.map((revision: string) => (
            <Paragraph
              copyable={{ text: revision }}
              key={`${revision + Math.random()}`}
            >
              {revision}
            </Paragraph>
          ));
        },
      },
      {
        title: "Actions",
        key: "actions",
        render: ({ attributeData }: any) => {
          return (
            <Button
              type="primary"
              onClick={() => {
                setModalRevision({
                  show: true,
                  did,
                  attribute: attributeData,
                });
              }}
            >
              <PlusOutlined />
              Add new revision
            </Button>
          );
        },
      },
    ],
    [did]
  );

  return (
    <Space direction="vertical">
      <Button
        type="primary"
        onClick={() => {
          setAttributeModal({
            show: true,
            did,
          });
        }}
      >
        <PlusOutlined />
        Add new attribute hash
      </Button>
      <AddAttributeHashModal
        showModal={modalAttribute.show}
        setModal={setAttributeModal}
        did={modalAttribute.did}
        loadTableData={() => loadAttributesWithRevision(did)}
      />
      <AddAttributeRevisionModal
        showModal={modalRevision.show}
        setModal={setModalRevision}
        did={modalRevision.did}
        attribute={modalRevision.attribute}
        loadTableData={() => loadAttributesWithRevision(did)}
      />
      <Button onClick={() => navigate(config.routes.trustedIssuersRegistry)}>
        <LeftOutlined />
        Back to listing
      </Button>
      <Table
        key="attributeData"
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
