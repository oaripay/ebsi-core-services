import React from "react";
import { Col, Modal, Row, Table } from "antd";
import useDidTable from "./use-did-table";

type PropType = {
  didRecord: any;
};

export default function RegisterDidTable({ didRecord }: PropType) {
  const { columns, dataSource, modal, resetModal, tableLoading } = useDidTable({
    didRecord,
  });
  return (
    <Row>
      <Col span={24}>
        <Modal
          title={modal.title}
          visible={modal.visible}
          width={modal.width}
          onCancel={resetModal}
          onOk={modal.onOk || resetModal}
        >
          <>{modal.content}</>
        </Modal>
        <Table
          rowKey="didControllers"
          columns={columns}
          dataSource={dataSource}
          loading={tableLoading}
          scroll={{
            x: 1600,
          }}
        />
      </Col>
    </Row>
  );
}
