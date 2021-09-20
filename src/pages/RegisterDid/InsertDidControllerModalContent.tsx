import React from "react";
import { Col, DatePicker, Form, Input, Row, FormInstance } from "antd";
import { ethers } from "ethers";
import { notAfterDate, notBeforeDate } from "../../date-validator";

type PropType = {
  form: FormInstance;
};

export default function InsertDidControllerModalContent({ form }: PropType) {
  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{
        newControllerId: "",
        notBefore: "",
        notAfter: "",
      }}
    >
      <Row>
        <Col span={24}>
          <Form.Item
            label="New controller ID (address)"
            name="newControllerId"
            rules={[
              { required: true, message: "Please input a new controller id!" },
              ({ getFieldValue }) => ({
                validator() {
                  try {
                    ethers.utils.getAddress(getFieldValue("newControllerId"));
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
          <Form.Item
            label="Start Date"
            name="notBefore"
            rules={[
              {
                required: true,
                message: "Please input a start date!",
              },
              notBeforeDate,
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Expire date"
            name="notAfter"
            rules={[
              {
                required: true,
                message: "Please input an expire date!",
              },
              notAfterDate,
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
