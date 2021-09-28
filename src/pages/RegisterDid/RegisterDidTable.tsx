import React from "react";
import {
  Button,
  Col,
  Input,
  Modal,
  Result,
  Row,
  Space,
  Table,
  Tabs,
} from "antd";
import { SmileOutlined } from "@ant-design/icons";

import useDidTable, { SourceType } from "./use-did-table";
import { useRegisterDidContext } from "./RegisterDid.context";

const { TabPane } = Tabs;

export default function RegisterDidTable() {
  const {
    columns,
    dataSource,
    modal,
    resetModal,
    tableLoading,
    setSourceType,
    loadDid,
    setDidToBeLoaded,
    removeDidsFromLs,
  } = useDidTable();
  const { publicKey } = useRegisterDidContext();
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
        {publicKey ? (
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
            <TabPane
              tab="My controller DIDs"
              key={SourceType.MY_CONTROLLER_DIDS}
            >
              <Space direction="vertical">
                <Row>
                  <Col span="20">
                    <Space>
                      <Input
                        name="did"
                        id="did"
                        placeholder="did:ebsi:....."
                        onChange={(event) => {
                          setDidToBeLoaded(event.currentTarget.value);
                        }}
                        style={{
                          width: 440,
                        }}
                      />
                      <Button type="primary" onClick={loadDid}>
                        Load DID
                      </Button>
                      <Button onClick={removeDidsFromLs}>
                        Remove DIDs from Browser Data
                      </Button>
                    </Space>
                  </Col>
                </Row>
                <Row>
                  <Table
                    rowKey="didControllers"
                    columns={columns}
                    dataSource={dataSource}
                    loading={tableLoading}
                    scroll={{
                      x: 1600,
                    }}
                  />
                </Row>
              </Space>
            </TabPane>
          </Tabs>
        ) : (
          <Result
            icon={<SmileOutlined />}
            title="Please sign message received in metamask in order to see your data!"
          />
        )}
      </Col>
    </Row>
  );
}
