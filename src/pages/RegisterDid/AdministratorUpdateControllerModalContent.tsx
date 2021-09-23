import { Col, Form, FormInstance, Input, Row } from "antd";
import React from "react";

type PropType = {
  form: FormInstance;
  walletAddress: string;
};

export default function AdministratorUpdateControllerModalContent({
  form,
  walletAddress,
}: PropType) {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        attribute: "",
        walletAddress,
      }}
    >
      <Row>
        <Col span={24}>
          <Form.Item label="Wallet address" name="walletAddress">
            <Input disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Form.Item
            label="Attribute"
            name="attribute"
            rules={[
              {
                required: true,
                message: "Please input an attribute to append!",
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
