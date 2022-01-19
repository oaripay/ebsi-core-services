import React, { useState } from "react";
import {
  Button,
  Col,
  Collapse,
  Form,
  FormInstance,
  Input,
  Modal,
  Row,
  Space,
} from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { ethers } from "ethers";
import { InsertUserAttrValueType } from "../types";
import { useNotificationContext } from "../../../components/Notification/Notification.context";

type PropType = {
  show: boolean;
  form: FormInstance;
  hideModal: () => void;
  submit: (values: InsertUserAttrValueType) => void;
};

export default function InsertUserAttributesForm({
  show,
  hideModal,
  form,
  submit,
}: PropType) {
  const { showPendingTxNotif } = useNotificationContext();
  const [activeKey, setActiveKey] = useState<string | string[]>("0");

  return (
    <Modal
      title="Add user attributes"
      okText="Save"
      visible={show}
      confirmLoading={showPendingTxNotif}
      onCancel={() => {
        hideModal();
        form.resetFields();
      }}
      onOk={form?.submit}
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          address: "",
          attributesWithValues: [
            {
              attribute: "",
              value: "",
            },
          ],
        }}
        onFinish={async (values) => {
          await submit(values);
          form.resetFields();
          hideModal();
        }}
      >
        <Form.Item
          label="User address"
          name="address"
          rules={[
            { required: true, message: "Field is required!" },
            ({ getFieldValue }) => ({
              validator() {
                try {
                  ethers.utils.getAddress(getFieldValue("address"));
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
        <Form.List name="attributesWithValues">
          {(fields, { add, remove }) => (
            <>
              <Space direction="vertical" className="w-100">
                {fields.map(({ key, name, fieldKey }) => (
                  <Collapse
                    accordion
                    key={key}
                    destroyInactivePanel
                    activeKey={activeKey}
                    onChange={(keyToSet: string | string[]) =>
                      setActiveKey(keyToSet)
                    }
                  >
                    <Collapse.Panel header={`Attribute ${name}`} key={name}>
                      <Form.Item
                        name={[name, "attribute"]}
                        fieldKey={[fieldKey, "attribute"]}
                        label="Attribute"
                        rules={[
                          { required: true, message: "Field is required" },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={[name, "value"]}
                        fieldKey={[fieldKey, "value"]}
                        label="Value"
                        rules={[
                          { required: true, message: "Field is required" },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    </Collapse.Panel>
                  </Collapse>
                ))}
                <Row justify="space-between">
                  <Col>
                    <Button
                      type="dashed"
                      onClick={() => {
                        add();
                        setActiveKey(`${fields.length}`);
                      }}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add new attribute
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      type="dashed"
                      disabled={fields.length === 1}
                      onClick={() => remove(fields.length - 1)}
                      block
                      icon={<MinusOutlined />}
                    >
                      Remove last attribute
                    </Button>
                  </Col>
                </Row>
              </Space>
            </>
          )}
        </Form.List>
        <Form.Item name="id" className="d-none">
          <Input />
        </Form.Item>
        <Form.Item name="id" className="d-none">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
