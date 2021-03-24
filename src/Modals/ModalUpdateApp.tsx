import React, { useContext } from "react";
import {
  Col,
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

export function ModalUpdateApp() {
  const [form] = Form.useForm();

  const { updateApp } = useRegistryContractHook();
  const appCtx = useContext(AppContext);

  return (
    <Modal
      title="Update application"
      visible={appCtx.editModal.show}
      okText="Save"
      onOk={() => {
        form.validateFields(["applicationId", "name", "publicKey"]).then(() => {
          const fields = form.getFieldsValue([
            "applicationId",
            "name",
            "publicKey",
          ]);

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

          appCtx.setEditModal({
            ...appCtx.editModal,
            show: false,
          });

          updateApp(fields.applicationId, fields.name, fields.domain)
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
                duration: 5,
                description:
                  "A problem appeared on trying to update app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
              });
            });
        });
      }}
      onCancel={() =>
        appCtx.setEditModal({
          ...appCtx.editModal,
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
        <h3>Application name must be unique</h3>
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            domain: appCtx.editModal.data?.domain,
            name: appCtx.editModal.data?.name,
            applicationId: appCtx.editModal?.data?.id,
          }}
        >
          <Row>
            <Col lg={20}>
              <Form.Item label="Application id" name="applicationId">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item label="Name" name="name">
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
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Space>
    </Modal>
  );
}
