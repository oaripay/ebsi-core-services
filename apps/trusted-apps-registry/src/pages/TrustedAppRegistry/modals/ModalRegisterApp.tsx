import React, { useEffect } from "react";
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
  Tooltip,
} from "antd";
import { ethers } from "ethers";

import { InfoCircleOutlined } from "@ant-design/icons";
import { useTrustedAppHook } from "../use-trusted-app.hook";
import { useAppContext } from "../../../AppContext";
import { notAfterDate, notBeforeDate } from "../../../date-validator";
import { useTableHook } from "../use-table-hook";
import { useEthersHook } from "../../../hooks/use-ethers.hook";
import { useNotificationContext } from "../../../components/Notification/Notification.context";

export function ModalRegisterApp({ setShowAddModal, showAddModal }: any) {
  const [form] = Form.useForm();

  const { registerApp } = useTrustedAppHook();
  const { didRegistryContract, registryContract } = useEthersHook();
  const appCtx = useAppContext();
  const { loadTableData } = useTableHook();
  const { setShowPendingTxNotif, showPendingTxNotif } =
    useNotificationContext();

  useEffect(() => {
    if (showAddModal) {
      form.resetFields();
    }
  }, [form, showAddModal]);

  return (
    <Modal
      title="Add new application"
      visible={showAddModal}
      okText="Save"
      okButtonProps={{
        loading: showPendingTxNotif,
        disabled: showPendingTxNotif,
      }}
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
              publicKey: ethers.utils.toUtf8Bytes(fields.publicKey),
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

            if (!didRegistryContract || !registryContract) {
              return;
            }

            didRegistryContract
              .getDidRecord(
                `0x${Buffer.from(fields.appAdministrator).toString("hex")}`
              )
              .then(() => {
                registryContract
                  .getAdministrator(fields.appAdministrator)
                  .then(() => {
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
                      .then((tx: any) => {
                        setShowPendingTxNotif(true);
                        tx.wait(1).then(() => {
                          loadTableData();
                          notification.success({
                            message: "Transaction mined",
                            description: `A new application was created!`,
                          });
                          setShowPendingTxNotif(false);
                        });
                        notification.info({
                          message: "Transaction",
                          description: (
                            <p>A transaction has been broadcasted.</p>
                          ),
                        });
                      })
                      .catch(() => {
                        notification.error({
                          message: "Error",
                          duration: 5,
                          description:
                            "A problem appeared on trying to register app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
                        });
                        setShowPendingTxNotif(false);
                      });
                  })
                  .catch(() => {
                    form.setFields([
                      {
                        name: "appAdministrator",
                        errors: [
                          "DID not defined as administrator in the Registry",
                        ],
                      },
                    ]);
                  });
              })
              .catch(() => {
                form.setFields([
                  {
                    name: "appAdministrator",
                    errors: ["DID not defined in DID Registry"],
                  },
                ]);
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
                label={
                  <Space>
                    Name (example: bus-country_code-entity_name-app_name)
                    <Tooltip title="Official application name">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="name"
                rules={[{ required: true, message: "Please input name!" }]}
              >
                <Input required />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item name="domain" label="Domain">
                <Select style={{ width: "100%" }} onChange={() => {}}>
                  <Select.Option value={1}>ebsi</Select.Option>
                  {/* <Select.Option value={2}>external_domain</Select.Option> */}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={20}>
              <Form.Item
                label="DID of the App Administator"
                name="appAdministrator"
                rules={[
                  {
                    required: true,
                    message: "Please input the DID of the app administrator!",
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
                label={
                  <Space>
                    Public key (pemBase64)
                    <Tooltip title="ASN.1 encoded application public key">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="publicKey"
                rules={[
                  { required: true, message: "Please input public key!" },
                ]}
              >
                <Input placeholder="LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtF..." />
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
                dependencies={["notBefore"]}
                label={
                  <Space>
                    Expire Date
                    <Tooltip title="If validity is indefinite, it should be set 0">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
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
