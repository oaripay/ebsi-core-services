import React, { useContext, useEffect } from "react";
import { Col, Form, Input, Modal, notification, Row, Space } from "antd";

import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";
import { AppContext } from "../AppContext";
import { config } from "../config";

export function ModalEditApp() {
  const [form] = Form.useForm();

  const { updateApp } = useRegistryContractHook();
  const appCtx = useContext(AppContext);

  useEffect(() => {
    form.resetFields();
  }, [appCtx.editModal.data]);

  return (
    <Modal
      title="Edit application"
      visible={appCtx.editModal.show}
      okText="Save"
      onOk={() => {
        form.validateFields(["name", "publicKey"]).then(() => {
          const fields = form.getFieldsValue(["name", "publicKey"]);

          notification.info({
            message: "Transaction",
            description: (
              <>
                <p>
                  A transaction is being sent to wallet. Please go to
                  <a href={config.WALLET_WEB_CLIENT_URL}> wallet</a> to sign and
                  broadcast the transaction
                </p>
              </>
            ),
          });

          updateApp(appCtx.editModal.data.name, fields.name, fields.publicKey)
            .then(() => {
              appCtx.setEditModal({ ...appCtx.editModal, show: false });
            })
            .catch(() => {
              notification.error({
                message: "Error",
                description:
                  "A problem appeared on trying to edit app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
              });
            });
        });
      }}
      onCancel={() => appCtx.setEditModal({ ...appCtx.editModal, show: false })}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Form
          layout="vertical"
          form={form}
          initialValues={appCtx.editModal.data}
        >
          <Row>
            <Col lg={24}>
              <Form.Item
                label="Public key"
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
            <Col lg={12}>
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
