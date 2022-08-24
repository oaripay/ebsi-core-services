import React, { ReactElement } from "react";
import { Button, FormInstance } from "antd";
import { useModalContext } from "./Modal.context";
import SchemaForm from "./forms/SchemaForm";
import { useNotificationContext } from "../../components/Notification/Notification.context";

export default function InsertSchema(props: {
  form: FormInstance;
  submit: () => {};
}): ReactElement {
  const { setModal, hideModal } = useModalContext();

  const { form, submit } = props;
  const { showPendingTxNotif } = useNotificationContext();

  return (
    <Button
      type="primary"
      loading={showPendingTxNotif}
      onClick={() => {
        setModal({
          show: true,
          options: {
            footer: [
              <Button
                key="close"
                onClick={() => {
                  form.resetFields();
                  hideModal();
                }}
              >
                Close
              </Button>,
              <Button
                key="save"
                type="primary"
                onClick={submit}
                loading={showPendingTxNotif}
              >
                Save
              </Button>,
            ],
          },
          content: <SchemaForm form={form} />,
        });
      }}
    >
      Insert new Schema
    </Button>
  );
}
