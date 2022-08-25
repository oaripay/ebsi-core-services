import { Col, Form, FormInstance, Input, Row } from "antd";
import React from "react";

type PropType = {
  form: FormInstance;
};

export default function UpdateDidDocumentModalContent({ form }: PropType) {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        hashAlgorithmId: "",
        document: "",
      }}
    >
      <Row>
        <Col span={24}>
          <Form.Item
            label="Document"
            name="document"
            rules={[
              {
                required: true,
                message: "Document is required!",
              },
              ({ getFieldValue }) => ({
                validator() {
                  try {
                    JSON.parse(getFieldValue("document"));
                    return Promise.resolve();
                  } catch (ex) {
                    return Promise.reject(
                      new Error("Not a valid document format!")
                    );
                  }
                },
              }),
            ]}
          >
            <Input.TextArea rows={20} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
