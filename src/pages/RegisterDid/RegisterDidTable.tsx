import React from "react";
import { Col, Modal, Row, Table } from "antd";
import useDidTable from "./use-did-table";

type PropType = {
  didRecord: any;
};

export default function RegisterDidTable({ didRecord }: PropType) {
  const { columns, dataSource, modal, resetModal } = useDidTable({ didRecord });
  return (
    <Row>
      <Col span={20}>
        <Modal
          title={modal.title}
          visible={modal.visible}
          width={1000}
          onCancel={resetModal}
          onOk={resetModal}
        >
          <p>{modal.content}</p>
        </Modal>
        <Table
          columns={columns}
          dataSource={dataSource}
          scroll={{
            x: 1600,
          }}
        />
      </Col>
    </Row>
  );
}
