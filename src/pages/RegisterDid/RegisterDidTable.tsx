import React from "react";
import { Col, Modal, Row, Table, Tabs } from "antd";

import useDidTable, { SourceType } from "./use-did-table";

const { TabPane } = Tabs;

type PropType = {
  didRecord: any;
};

export default function RegisterDidTable({ didRecord }: PropType) {
  const {
    columns,
    dataSource,
    modal,
    resetModal,
    tableLoading,
    setSourceType,
  } = useDidTable({
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
        <Tabs
          type="card"
          onChange={(activeKey: string) => {
            setSourceType(activeKey);
          }}
        >
          <TabPane tab="My DID record" key={SourceType.MY_DID_RECORD}>
            <Table
              rowKey="didControllers"
              columns={columns}
              dataSource={dataSource}
              loading={tableLoading}
              scroll={{
                x: 1600,
              }}
            />
          </TabPane>
          <TabPane tab="My controller DIDs" key={SourceType.MY_CONTROLLER_DIDS}>
            <Table
              rowKey="didControllers"
              columns={columns}
              dataSource={dataSource}
              loading={tableLoading}
              scroll={{
                x: 1600,
              }}
            />
          </TabPane>
        </Tabs>
      </Col>
    </Row>
  );
}
