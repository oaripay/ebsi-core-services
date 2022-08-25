import React, { ReactElement } from "react";
import { Form, Input } from "antd";
import { FormInstance } from "antd/es/form/hooks/useForm";

export default function SchemaForm({
  form,
}: {
  form: FormInstance;
}): ReactElement {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        schemaId: "",
        schema: "",
        metadata: "",
      }}
    >
      <Form.Item
        label="Schema ID"
        name="schemaId"
        rules={[{ required: true, message: "Field is required" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Schema"
        name="schema"
        rules={[
          { required: true, message: "Field is required" },
          ({ getFieldValue }) => ({
            validator() {
              try {
                JSON.parse(getFieldValue("schema"));
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
