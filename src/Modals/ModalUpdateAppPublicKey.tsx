import React, { useContext, useEffect } from "react";
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

import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";
import { AppContext } from "../AppContext";
import { notAfterDate } from "../date-validator";
import { useTableHook } from "../hooks/use-table-hook";

export function ModalUpdateAppPublicKey() {
  const [form] = Form.useForm();

  const { updateAppPublicKey } = useRegistryContractHook();
  const appCtx = useContext(AppContext);
  const { loadTableData } = useTableHook();

  useEffect(() => {
    if (appCtx.updateAppPublicKey.show) {
      form.resetFields();
    }
  }, [appCtx.updateAppPublicKey.show]);

  return (
    <Modal
      width={640}
      title="Update the status of an app public key"
      visible={appCtx.updateAppPublicKey.show}
      okText="Save"
      onOk={() => {
        form.validateFields(["publicKey", "status", "notAfter"]).then(() => {
          const fields = form.getFieldsValue([
            "publicKey",
            "status",
            "notAfter",
          ]);

          appCtx.setUpdateAppPublicKey({
            ...appCtx.updateAppPublicKey,
            show: false,
          });

          updateAppPublicKey(
            fields.publicKey,
            fields.status,
            fields.notAfter.unix()
          )
            .then((tx: any) => {
              tx.wait(1).then(() => {
                loadTableData();
                notification.success({
                  message: "Transaction mined",
                  description: `A public key was updated!`,
                });
              });
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
                duration: 5,
                description:
                  "A problem appeared on trying to update app public key. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
              });
            });
        });
      }}
      onCancel={() =>
        appCtx.setUpdateAppPublicKey({
          ...appCtx.updateAppPublicKey,
          show: false,
        })
      }
    >
      <Space
        direction="vertical"
        size="middle"
        style={{
          width: "100%",
        }}
      >
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            status: appCtx.updateAppPublicKey.data?.status,
            applicationId: appCtx.updateAppPublicKey.data?.id,
            notAfter: appCtx.updateAppPublicKey?.data?.notAfter,
          }}
        >
          <Row>
            <Col lg={24}>
              <Form.Item label="Application id (unique)" name="applicationId">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={24}>
              <Form.Item label="Select Public key to update" name="publicKey">
                <Select style={{ width: "100%" }}>
                  {appCtx.updateAppPublicKey.data?.publicKeys.map(
                    (key: string) => (
                      <Select.Option key={key} value={key}>
                        {key}
                      </Select.Option>
                    )
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={24}>
              <Form.Item label="Select new Status" name="status">
                <Select style={{ width: "100%" }} onChange={() => {}}>
                  <Select.Option value={1}>active</Select.Option>
                  <Select.Option value={2}>revoked</Select.Option>
                  <Select.Option value={3}>suspended</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={24}>
              <Form.Item
                label="Expire date"
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
