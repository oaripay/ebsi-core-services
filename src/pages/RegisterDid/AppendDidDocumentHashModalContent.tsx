import { Col, DatePicker, Form, FormInstance, Row, Select } from "antd";
import React from "react";
import { config } from "../../config";
import { HashAlgo } from "./DidTableTypes";

type PropType = {
  form: FormInstance;
};

export default function AppendDidDocumentHashModalContent({ form }: PropType) {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        walletAddress: "",
        notBefore: "",
        notAfter: "",
      }}
    >
      <Row>
        <Col span={24}>
          <Form.Item
            label="Hash algorithm id"
            name="hashAlgorithmId"
            rules={[{ required: true }]}
          >
            <Select style={{ width: "100%" }} onChange={() => {}}>
              {config.hashAlgos.map((hashAlgo: HashAlgo) => {
                return (
                  <Select.Option key={hashAlgo.id} value={hashAlgo.id}>
                    {hashAlgo.name}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Form.Item
            label="Timestamp"
            name="timestamp"
            rules={[
              {
                required: true,
                message: "Please input a timestamp!",
              },
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
