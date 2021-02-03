import React, { ReactElement, useContext } from "react";
import {
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  notification,
  Row,
  Select,
  Space,
} from "antd";
import { ethers } from "ethers";
import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";
import { AppContext } from "../AppContext";

export default function ModalInsertPublicKey(): ReactElement {
  const [form] = Form.useForm();

  const { insertAppPublicKey } = useRegistryContractHook();
  const appCtx = useContext(AppContext);

  return (
    <Modal
      title="Add public key"
      visible={appCtx.insertPublicKeyModal.show}
      okText="Save"
      onOk={() => {
        form
          .validateFields([
            "appId",
            "publicKey",
            "status",
            "notBefore",
            "notAfter",
          ])
          .then(() => {
            const fields = form.getFieldsValue([
              "appId",
              "publicKey",
              "status",
              "notBefore",
              "notAfter",
            ]);

            const insertPubKeyFields: any = {
              ...fields,
              notBefore: fields.notBefore.unix(),
              notAfter: fields.notAfter.unix(),
              publicKey: ethers.utils.formatBytes32String(fields.publicKey),
            };

            appCtx.setInsertPublicKeyModal({
              ...appCtx.insertPublicKeyModal,
              show: false,
            });

            insertAppPublicKey(
              insertPubKeyFields.appId,
              insertPubKeyFields.publicKey,
              insertPubKeyFields.status,
              insertPubKeyFields.notBefore,
              insertPubKeyFields.notAfter
            )
              .then(() => {
                notification.info({
                  message: "Transaction",
                  description: (
                    <>
                      <p>A transaction has been broadcasted.</p>
                    </>
                  ),
                });
              })
              .catch(() => {
                notification.error({
                  message: "Error",
                  description:
                    "A problem appeared on trying to add public key to app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
                });
              });
          });
      }}
      onCancel={() =>
        appCtx.setInsertPublicKeyModal({
          show: false,
        })
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Form
          initialValues={{
            status: 1,
          }}
          layout="vertical"
          form={form}
        >
          <Row>
            <Col lg={24}>
              <Form.Item
                label="APP Id"
                name="appId"
                rules={[{ required: true, message: "Please input app id!" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
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
            <Col lg={20}>
              <Form.Item label="Status" name="status">
                <Select style={{ width: "100%" }} onChange={() => {}}>
                  <Select.Option value={1}>active</Select.Option>
                  <Select.Option value={2}>revoked</Select.Option>
                  <Select.Option value={3}>suspended</Select.Option>
                  <Select.Option value={0}>undefined</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item
                label="Not before"
                name="notBefore"
                rules={[
                  {
                    required: true,
                    message: "Please input a not before date!",
                  },
                ]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item
                label="Not after"
                name="notAfter"
                rules={[
                  {
                    required: true,
                    message: "Please input a not after date!",
                  },
                  ({ getFieldValue }) => ({
                    validator() {
                      const notBefore = getFieldValue("notBefore");
                      const notAfter = getFieldValue("notAfter");
                      if (notBefore.diff(notAfter) > 0) {
                        return Promise.reject(
                          new Error(
                            "Not after date is less than not before date!"
                          )
                        );
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Space>
    </Modal>
  );
}
