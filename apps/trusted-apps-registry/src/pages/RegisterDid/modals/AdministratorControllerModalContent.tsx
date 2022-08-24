import { Col, Form, FormInstance, Input, Row } from "antd";
import React from "react";
import { ethers } from "ethers";

type PropType = {
  form: FormInstance;
};

export default function AdministratorControllerModalContent({
  form,
}: PropType) {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        walletAddress: "",
      }}
    >
      <Row>
        <Col span={24}>
          <Form.Item
            label="Wallet address"
            name="walletAddress"
            rules={[
              { required: true, message: "Please input a new wallet address!" },
              ({ getFieldValue }) => ({
                validator() {
                  try {
                    ethers.utils.getAddress(getFieldValue("walletAddress"));
                    return Promise.resolve();
                  } catch (ex) {
                    return Promise.reject(
                      new Error("Not a valid ethereum address")
                    );
                  }
                },
              }),
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
