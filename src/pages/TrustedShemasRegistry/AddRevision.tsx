import React, { ReactElement } from "react";
import { Button, FormInstance } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useModalContext } from "./Modal.context";
import SchemaForm from "./forms/SchemaForm";

export default function AddRevision(props: {
  form: FormInstance;
  submit: () => {};
  schemaId: string;
}): ReactElement {
  const { setModal, hideModal } = useModalContext();

  const { form, submit, schemaId } = props;

  return (
    <Button
      type="primary"
      onClick={() => {
        form.setFieldsValue({
          schemaId,
        });
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
              <Button key="save" type="primary" onClick={submit}>
                Save
              </Button>,
            ],
          },
          content: <SchemaForm form={form} />,
        });
      }}
    >
      <PlusOutlined /> Add new revision
    </Button>
  );
}
