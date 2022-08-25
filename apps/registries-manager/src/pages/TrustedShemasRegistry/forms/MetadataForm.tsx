import React, { ReactElement } from "react";
import { Form, Input } from "antd";
import { FormInstance } from "antd/es/form/hooks/useForm";

export default function MetadataForm({
  form,
}: {
  form: FormInstance;
}): ReactElement {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        schemaRevisionId: "",
        metadata: "",
      }}
    >
      <Form.Item
        label="Schema revision ID"
        name="schemaRevisionId"
        rules={[{ required: true, message: "Field is required" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Metadata"
        name="metadata"
        rules={[
          { required: true, message: "Field is required" },
          ({ getFieldValue }) => ({
            validator() {
              try {
                JSON.parse(getFieldValue("metadata"));
                return Promise.resolve();
              } catch (ex) {
                return Promise.reject(new Error("Not a valid JSON format"));
              }
            },
          }),
        ]}
      >
        <Input.TextArea rows={6} />
      </Form.Item>
    </Form>
  );
}
