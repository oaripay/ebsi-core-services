import React, { useContext } from "react";
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
        form
          .validateFields([
            "name",
            "publicKey",
            "appAdministrator",
            "notBefore",
            "notAfter",
          ])
          .then(() => {
            const fields = form.getFieldsValue([
              "name",
              "domain",
              "appAdministrator",
              "publicKey",
              "status",
              "notBefore",
              "notAfter",
            ]);

            const registerAppFields: any = {
              ...fields,
              notBefore: fields.notBefore.unix(),
              notAfter: fields.notAfter.unix(),
              publicKey: ethers.utils.formatBytes32String(fields.publicKey),
            };

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

            registerApp(
              registerAppFields.name,
              registerAppFields.domain,
              registerAppFields.appAdministrator,
              registerAppFields.publicKey,
              registerAppFields.status,
              registerAppFields.notBefore,
              registerAppFields.notAfter
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
                    "A problem appeared on trying to register app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
                });
              });
          });
      }}
      onCancel={() => setShowAddModal(false)}
    >
      <Space direction="vertical" size="middle">
        <h3>Application name must be unique</h3>
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            domain: 1,
            status: 1,
          }}
        >
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
          <Row>
            <Col lg={20}>
              <Form.Item label="Domain" name="domain">
                <Select style={{ width: "100%" }} onChange={() => {}}>
                  <Select.Option value={1}>ebsi</Select.Option>
                  <Select.Option value={2}>external_domain</Select.Option>
                  <Select.Option value={0}>undefined</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item
                label="App Administrator"
                name="appAdministrator"
                rules={[
                  {
                    required: true,
                    message: "Please input app administrator!",
                  },
                ]}
              >
                <Input required />
              </Form.Item>
            </Col>
          </Row>
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
