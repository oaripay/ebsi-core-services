import React, { ReactElement, useContext, useEffect } from "react";
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
import { notAfterDate, notBeforeDate } from "../date-validator";
import { useTableHook } from "../hooks/use-table-hook";

export default function ModalInsertPublicKey(): ReactElement {
  const [form] = Form.useForm();

  const { insertAppPublicKey } = useRegistryContractHook();
  const { loadTableData } = useTableHook();
  const appCtx = useContext(AppContext);

  useEffect(() => {
    form.setFieldsValue({
      appId: appCtx.insertPublicKeyModal.appId,
    });
  }, [appCtx.insertPublicKeyModal.appId]);

  useEffect(() => {
    if (appCtx.insertPublicKeyModal.show) {
      form.resetFields();
    }
  }, [appCtx.insertPublicKeyModal.show]);

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

            let publicKeyFormatted;

            try {
              publicKeyFormatted = ethers.utils.formatBytes32String(
                fields.publicKey
              );
            } catch (ex) {
              publicKeyFormatted = fields.publicKey;
            }

            const insertPubKeyFields: any = {
              ...fields,
              notBefore: fields.notBefore.unix(),
              notAfter: fields.notAfter.unix(),
              publicKey: publicKeyFormatted,
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
              .then((tx: any) => {
                tx.wait(1).then(() => {
                  loadTableData();
                  notification.success({
                    message: "Transaction mined",
                    description: `A new public key was added!`,
                  });
                });
                form.resetFields();
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
          data: {},
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
                  notBeforeDate,
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
                  notAfterDate,
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
