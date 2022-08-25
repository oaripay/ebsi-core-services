import React, { ReactElement } from "react";
import { Button, FormInstance } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useModalContext } from "./Modal.context";
import MetadataForm from "./forms/MetadataForm";

export default function AddMetadata(props: {
  form: FormInstance;
  submit: () => {};
  schemaRevisionId: string;
}): ReactElement {
  const { setModal, hideModal } = useModalContext();

  const { form, submit, schemaRevisionId } = props;

  return (
    <Button
      type="primary"
      onClick={() => {
        form.setFieldsValue({
          schemaRevisionId,
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
          content: <MetadataForm form={form} />,
        });
      }}
    >
      <PlusOutlined /> Add metadata
    </Button>
  );
}
