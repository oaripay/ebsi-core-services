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

import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";
import { AppContext } from "../AppContext";
import { notAfterDate, notBeforeDate } from "../date-validator";
import { useTableHook } from "../hooks/use-table-hook";
import { useEthersHook } from "../hooks/use-ethers.hook";

export default function ModalInsertAuth(): ReactElement {
  const [form] = Form.useForm();

  const { insertAuthorization } = useRegistryContractHook();
  const { didRegistryContract, registryContract } = useEthersHook();
  const { loadTableData } = useTableHook();
  const appCtx = useContext(AppContext);

  useEffect(() => {
    if (appCtx.authorizedAppsModal.show) {
      form.resetFields();
    }
  }, [appCtx.authorizedAppsModal.show, form]);

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
            "permissions",
            "notBefore",
            "notAfter",
          ])
          .then(() => {
            const fields = form.getFieldsValue([
              "authorizedAppName",
              "iss",
              "status",
              "permissions",
              "notBefore",
              "notAfter",
            ]);

            const insertAuthFields: any = {
              ...fields,
              name: appCtx.authorizedAppsModal.data.name,
              notBefore: fields.notBefore.unix(),
              notAfter: fields.notAfter.unix(),
            };

            if (!didRegistryContract || !registryContract) {
              return;
            }

            didRegistryContract
              .getDidRecord(
                `0x${Buffer.from(insertAuthFields.iss).toString("hex")}`
              )
              .then(() => {
                registryContract
                  .getAdministrator(insertAuthFields.iss)
                  .then(() => {
                    appCtx.setAuthorizedAppsModal({
                      show: false,
                    });
                    insertAuthorization(
                      insertAuthFields.name,
                      insertAuthFields.authorizedAppName,
                      insertAuthFields.iss,
                      insertAuthFields.status,
                      insertAuthFields.permissions,
                      insertAuthFields.notBefore,
                      insertAuthFields.notAfter
                    )
                      .then((tx: any) => {
                        tx.wait(1).then(() => {
                          loadTableData();
                          notification.success({
                            message: "Transaction mined",
                            description: `A new authorization was added to app ${insertAuthFields.name}!`,
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
                  })
                  .catch((e: any) => {
                    console.log(e);
                    form.setFields([
                      {
                        name: "iss",
                        errors: ["DID not defined as admin in the Registry"],
                      },
                    ]);
                  });
              })
              .catch(() => {
                form.setFields([
                  {
                    name: "iss",
                    errors: ["DID not defined in DID Registry"],
                  },
                ]);
              });
          });
      }}
      onCancel={() =>
        appCtx.setAuthorizedAppsModal({
          data: {},
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
            permissions: 15,
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
                label="ISS (did of the authorization issuer)"
                name="iss"
                rules={[
                  { required: true, message: "Please input iss!" },
                  ({ getFieldValue }) => ({
                    validator() {
                      const iss = getFieldValue("iss");
                      if (iss.indexOf("did:ebsi:") !== 0) {
                        return Promise.reject(
                          new Error("Input should start with did:ebsi:")
                        );
                      }
                      return Promise.resolve();
                    },
                  }),
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
            <Col lg={24}>
              <Form.Item
                label="Permissions"
                name="permissions"
                rules={[
                  { required: true, message: "Please input permissions!" },
                ]}
              >
                <Select style={{ width: "100%" }}>
                  <Select.Option value={0}>none</Select.Option>
                  <Select.Option value={1}>d</Select.Option>
                  <Select.Option value={2}>u</Select.Option>
                  <Select.Option value={3}>ud</Select.Option>
                  <Select.Option value={4}>r</Select.Option>
                  <Select.Option value={5}>rd</Select.Option>
                  <Select.Option value={6}>ru</Select.Option>
                  <Select.Option value={7}>rud</Select.Option>
                  <Select.Option value={8}>c</Select.Option>
                  <Select.Option value={9}>cd</Select.Option>
                  <Select.Option value={10}>cu</Select.Option>
                  <Select.Option value={11}>cud</Select.Option>
                  <Select.Option value={12}>cr</Select.Option>
                  <Select.Option value={13}>crd</Select.Option>
                  <Select.Option value={14}>cru</Select.Option>
                  <Select.Option value={15}>crud</Select.Option>
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
                label="Expire date"
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
