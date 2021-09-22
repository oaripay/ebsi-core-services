import { Col, Form, FormInstance, Row, Select } from "antd";
import React from "react";
import { HashAlgo } from "./DidTableTypes";

type PropType = {
  form: FormInstance;
  hashAlgos: HashAlgo[];
};

export default function DidDocumentModalContent({ form, hashAlgos }: PropType) {
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
          <Form.Item label="Hash algorithm id" name="hashAlgorithmId">
            <Select style={{ width: "100%" }} onChange={() => {}}>
              {hashAlgos.map((hashAlgo: HashAlgo) => {
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
    </Form>
  );
}
