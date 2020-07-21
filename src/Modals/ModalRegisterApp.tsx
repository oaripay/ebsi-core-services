import React, { useContext } from "react";
import { Col, Form, Input, Modal, notification, Row, Space } from "antd";

import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";
import { config } from "../config";
import { AppContext } from "../AppContext";

export function ModalRegisterApp({ setShowAddModal, showAddModal }: any) {
  const [form] = Form.useForm();

  const { registerApp } = useRegistryContractHook();
  const appCtx = useContext(AppContext);

  return (
    <Modal
      title="Add new application"
      visible={showAddModal}
      okText="Save"
      onOk={() => {
        form.validateFields(["name", "publicKey"]).then(() => {
          const fields = form.getFieldsValue(["name", "publicKey"]);

          const appNames = appCtx.tableDataSource.filter(
            (item) => item.name === fields.name
          );

          if (appNames.length > 0) {
            form.setFields([
              {
                name: "name",
                errors: ["Application name already exists"],
              },
            ]);
            return;
          }

          setShowAddModal(false);

          registerApp(fields.publicKey, fields.name)
            .then(() => {
              notification.info({
                message: "Transaction",
                description: (
                  <>
                    <p>
                      A transaction is being sent to wallet. Please go to
                      <a href={config.WALLET_WEB_CLIENT_URL}> wallet</a> to sign
                      and broadcast the transaction
                    </p>
                  </>
                ),
              });
            })
            .catch(() => {
              notification.error({
                message: "Error",
                description:
                  "A problem appeared on trying to register app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
              });
            });
        });
      }}
      onCancel={() => setShowAddModal(false)}
    >
      <Space direction="vertical" size="middle">
        <h3>Application name must be unique</h3>
        <Form layout="vertical" form={form}>
          <Row>
            <Col lg={24}>
              <Form.Item
                label="Public key (Base64 encode of EC secp256k1 key)"
                name="publicKey"
                rules={[
                  { required: true, message: "Please input public key!" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true, message: "Please input name!" }]}
              >
                <Input required />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Space>
    </Modal>
  );
}
