import React, { ReactElement, useEffect } from "react";
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
import { useAppContext } from "../AppContext";
import { notAfterDate, notBeforeDate } from "../date-validator";
import { useTableHook } from "../hooks/use-table-hook";

export default function ModalInsertPublicKey(): ReactElement {
  const [form] = Form.useForm();

  const { insertAppPublicKey } = useRegistryContractHook();
  const { loadTableData } = useTableHook();
  const appCtx = useAppContext();

  useEffect(() => {
    if (appCtx.insertPublicKeyModal.show) {
      form.resetFields();
    }
  }, [appCtx.insertPublicKeyModal.show, form]);

  return (
    <Modal
      title="Add public key"
      visible={appCtx.insertPublicKeyModal.show}
      okText="Save"
      onOk={() => {
        form
          .validateFields(["publicKey", "status", "notBefore", "notAfter"])
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
              publicKey: ethers.utils.toUtf8Bytes(
                Buffer.from(fields.publicKey, "base64").toString()
              ),
              notBefore: fields.notBefore.unix(),
              notAfter: fields.notAfter.unix(),
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
            appId: appCtx.insertPublicKeyModal.data?.appId,
          }}
          layout="vertical"
          form={form}
        >
          <Row>
            <Col lg={24}>
              <Form.Item label="APP Id" name="appId">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={24}>
              <Form.Item
                label="Public key (pemBase64 format)"
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
                label="Start Date"
                name="notBefore"
                rules={[
                  {
                    required: true,
                    message: "Please input a start date!",
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
                label="Expire Date"
                name="notAfter"
                rules={[
                  {
                    required: true,
                    message: "Please input an expire date!",
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
