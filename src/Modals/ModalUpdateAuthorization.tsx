import React, { useContext, useEffect } from "react";
import {
  Col,
  DatePicker,
  Form,
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

export function ModalUpdateAuthorization() {
  const [form] = Form.useForm();

  const {
    updateAuthorization,
    getAuthorizationsIds,
  } = useRegistryContractHook();
  const appCtx = useContext(AppContext);

  const { loadTableData } = useTableHook();

  useEffect(() => {
    if (appCtx.updateAuthorization.show) {
      form.resetFields();
    }
  }, [appCtx.updateAuthorization.show]);

  return (
    <Modal
      width={640}
      title="Update authorization"
      visible={appCtx.updateAuthorization.show}
      okText="Save"
      onOk={() => {
        form
          .validateFields([
            "authorizationId",
            "status",
            "permissions",
            "notAfter",
          ])
          .then(() => {
            const fields = form.getFieldsValue([
              "authorizationId",
              "status",
              "permissions",
              "notAfter",
            ]);

            appCtx.setUpdateAuthorization({
              ...appCtx.updateAuthorization,
              show: false,
            });

            getAuthorizationsIds(
              appCtx.updateAuthorization.data?.appId,
              fields.authorizationId
            ).then((authsData: string[]) => {
              if (authsData.length === 0) {
                throw new Error("No AUTHS ids");
              }
              updateAuthorization(
                authsData[0],
                fields.status,
                fields.permissions,
                fields.notAfter.unix()
              )
                .then((tx: any) => {
                  tx.wait(1).then(() => {
                    loadTableData();
                    notification.success({
                      message: "Transaction mined",
                      description: `An authorization has been updated!`,
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
                    duration: 5,
                    description:
                      "A problem appeared on trying to update authorization. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
                  });
                });
            });
          });
      }}
      onCancel={() =>
        appCtx.setUpdateAuthorization({
          ...appCtx.updateAuthorization,
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
            appId: appCtx.updateAuthorization.data?.authorizationId,
            permissions: 15,
            status: 1,
          }}
        >
          <Row>
            <Col lg={24}>
              <Form.Item label="Existing Authorized app" name="authorizationId">
                <Select style={{ width: "100%" }} onChange={() => {}}>
                  {appCtx.updateAuthorization.data?.authorizedApps?.map(
                    (app: string) => {
                      let name = appCtx.tableDataSource.find(
                        (param: any) => param.id === app
                      )?.name;
                      if (!name) {
                        name = appCtx.missingApps.find(
                          (param: any) => param.id === app
                        )?.name;
                      }
                      return (
                        <Select.Option key={app} value={app}>
                          {name}
                        </Select.Option>
                      );
                    }
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col lg={24}>
              <Form.Item label="New status" name="status">
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
                label="New Permissions"
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
            <Col lg={24}>
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
