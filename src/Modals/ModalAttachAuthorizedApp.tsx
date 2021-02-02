import { Form, Modal, notification, Select } from "antd";
import React, { useContext, useEffect, useMemo } from "react";
import _ from "lodash";

import { AppContext } from "../AppContext";
import { useRegistryContractHook } from "../hooks/use-registry-contract.hook";

const { Option } = Select;

export function ModalAttachAuthorizedApp() {
  const appCtx = useContext(AppContext);
  const [form] = Form.useForm();

  const {
    addNewAuthorization,
    deleteAuthorization,
  } = useRegistryContractHook();

  const appNames = useMemo(() => {
    return appCtx.tableDataSource.map((item) => item.name);
  }, [appCtx.tableDataSource]);

  const selectedAppNames = useMemo(() => {
    return appCtx.authorizedAppsModal.data?.authorizedApps;
  }, [appCtx.authorizedAppsModal]);

  const options = appNames.map((app) => (
    <Option key={app} value={app}>
      {app}
    </Option>
  ));

  useEffect(() => {
    form.resetFields();
  }, [options]);

  return (
    <Modal
      title="Attach authorized apps"
      visible={appCtx.authorizedAppsModal.show}
      okText="Save"
      onOk={async () => {
        const removed = _.differenceBy(
          selectedAppNames,
          form.getFieldValue("authApps")
        );
        const addedNew = _.differenceBy(
          form.getFieldValue("authApps"),
          selectedAppNames
        );

        try {
          if (addedNew.length) {
            let addNewName: any;
            for (addNewName of addedNew) {
              await addNewAuthorization(
                appCtx.authorizedAppsModal.data.name,
                addNewName
              );
            }
          }
          if (removed.length) {
            let removedName: any;

            for (removedName of removed) {
              await deleteAuthorization(
                appCtx.authorizedAppsModal.data.name,
                removedName
              );
            }
          }

          appCtx.setAuthorizedAppsModal({
            ...appCtx.authorizedAppsModal,
            show: false,
          });
          notification.info({
            message: "Transaction",
            description: (
              <>
                <p>A transaction has been broadcasted.</p>
              </>
            ),
          });
        } catch (ex) {
          notification.error({
            message: "Error",
            description:
              "A problem appeared on trying to attach app. Please make sure you're logged in wallet client. If that didn't fix please contact an admin for further instructions!",
          });
        }
      }}
      onCancel={() => {
        appCtx.setAuthorizedAppsModal({
          ...appCtx.authorizedAppsModal,
          show: false,
        });
      }}
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          authApps: selectedAppNames,
        }}
      >
        <Form.Item label="Authorized apps" name="authApps">
          {appNames.length && (
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Please select"
              onChange={() => {}}
            >
              {options}
            </Select>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
