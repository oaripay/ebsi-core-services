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

import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";
import { AppContext } from "../AppContext";

export default function ModalInsertAuth(): ReactElement {
  const [form] = Form.useForm();

  const { insertAuthorization } = useRegistryContractHook();
  const appCtx = useContext(AppContext);

  return (
    <Modal
      title="Add auth"
      visible={appCtx.authorizedAppsModal.show}
      okText="Save"
      onOk={() => {
        form
          .validateFields([
            "authorizedAppName",
            "iss",
            "status",
            "operations",
            "notBefore",
            "notAfter",
          ])
          .then(() => {
            const fields = form.getFieldsValue([
              "authorizedAppName",
              "iss",
              "status",
              "operations",
              "notBefore",
              "notAfter",
            ]);

            const insertAuthFields: any = {
              ...fields,
              name: appCtx.authorizedAppsModal.data.name,
              notBefore: fields.notBefore.unix(),
              notAfter: fields.notAfter.unix(),
            };

            appCtx.setAuthorizedAppsModal({
              show: false,
            });

            insertAuthorization(
              insertAuthFields.name,
              insertAuthFields.authorizedAppName,
              insertAuthFields.iss,
              insertAuthFields.status,
              insertAuthFields.operations,
              insertAuthFields.notBefore,
              insertAuthFields.notAfter
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
        appCtx.setAuthorizedAppsModal({
          show: false,
        })
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            status: 1,
          }}
        >
          <Row>
            <Col lg={24}>
              <Form.Item
                label="Authorized app name"
                name="authorizedAppName"
                rules={[
                  { required: true, message: "Please input auth app name!" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={24}>
              <Form.Item
                label="ISS"
                name="iss"
                rules={[{ required: true, message: "Please input iss!" }]}
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
            <Col lg={24}>
              <Form.Item
                label="Operations"
                name="operations"
                rules={[
                  { required: true, message: "Please input operations!" },
                ]}
              >
                <Input />
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
