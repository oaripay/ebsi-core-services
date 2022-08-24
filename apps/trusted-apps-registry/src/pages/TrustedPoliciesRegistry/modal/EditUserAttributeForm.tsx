import React, { ReactElement } from "react";
import { Form, FormInstance, Input, Modal } from "antd";
import { useTrustedPoliciesUsersContext } from "../PoliciesUsers.context";
import { EditFormValueType } from "../types";

type PropType = {
  form: FormInstance;
  show: boolean;
  hideModal: () => void;
  submit: (values: EditFormValueType) => void;
};

export default function EditUserAttributeForm({
  form,
  show,
  hideModal,
  submit,
}: PropType): ReactElement {
  const { loading } = useTrustedPoliciesUsersContext();

  return (
    <Modal
      title="Edit user attribute"
      okText="Save"
      visible={show}
      confirmLoading={loading}
      onCancel={() => {
        hideModal();
        form.resetFields();
      }}
      onOk={async () => {
        await form.submit();
        hideModal();
      }}
    >
      <Form layout="vertical" form={form} onFinish={submit}>
        <Form.Item label="Address" name="address" className="d-none">
          <Input />
        </Form.Item>
        <Form.Item label="Name" name="attribute" className="d-none">
          <Input />
        </Form.Item>
        <Form.Item
          label="Value"
          name="value"
          rules={[{ required: true, message: "Field is required!" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
