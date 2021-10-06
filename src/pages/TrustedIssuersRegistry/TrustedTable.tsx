import React, { ReactElement, useState } from "react";
import { Table } from "antd";
import useTrustedIssuersTable from "./hooks/use-trusted-issuers-table";
import AddAttributeHashModal from "./AddAttributeHashModal";
import AddAttributeRevisionModal from "./AddAttributeRevisionModal";
import { PAGE_SIZE } from "./constants";

type ModalAttributeType = {
  show: boolean;
  did: string;
};

type ModalRevisionType = {
  show: boolean;
  did: string;
  attributes: string[];
};

type TablePaginationPosition =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

export default function TrustedTable(): ReactElement {
  const [modalAttribute, setAttributeModal] = useState<ModalAttributeType>({
    show: false,
    did: "",
  });
  const [modalRevision, setModalRevision] = useState<ModalRevisionType>({
    show: false,
    did: "",
    attributes: [],
  });
  const {
    columns,
    dataSource,
    tableLoading,
    loadTableData,
    totalItems,
    page,
    setPage,
  } = useTrustedIssuersTable({
    setAttributeHashModal: setAttributeModal,
    setRevisionModal: setModalRevision,
  });

  const position: TablePaginationPosition = "bottomCenter";
  return (
    <>
      <AddAttributeHashModal
        showModal={modalAttribute.show}
        setModal={setAttributeModal}
        did={modalAttribute.did}
        loadTableData={loadTableData}
      />
      <AddAttributeRevisionModal
        showModal={modalRevision.show}
        setModal={setModalRevision}
        did={modalRevision.did}
        attributes={modalRevision.attributes}
        loadTableData={loadTableData}
      />
      <Table
        key="did"
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
          position: [position],
          total: totalItems,
        }}
      />
    </>
  );
}
