import React, { ReactElement, useState } from "react";
import {
  Button,
  Col,
  Collapse,
  Form,
  FormInstance,
  Input,
  Modal,
  Row,
  Select,
  Space,
} from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import {
  InsertNewPolicyValueType,
  Operation,
  OperationType,
  PolicyCondition,
  TypeOfValue,
} from "../types";
import { useNotificationContext } from "../../../components/Notification/Notification.context";

const { Panel } = Collapse;

export type InitialValuesNewEditPolicy = {
  id: number;
  opType: string;
  name: string;
  attributeName: string;
  typeOfValue: string;
  value: string;
  attributeOperation: string;
  policyName: string;
  description: string;
  status: boolean;
  policyConditions?: PolicyCondition[];
};

type PropType = {
  show: boolean;
  form?: FormInstance;
  hideModal: () => void;
  submit: (values: InsertNewPolicyValueType) => void;
  isEdit: boolean;
};

const initialValues: InitialValuesNewEditPolicy = {
  id: 0,
  opType: "",
  name: "",
  attributeName: "",
  typeOfValue: "",
  value: "",
  attributeOperation: "",
  policyName: "",
  description: "",
  policyConditions: [],
  status: false,
};

export default function NewEditPolicyForm(prop: PropType): ReactElement {
  const [activeKey, setActiveKey] = useState<string | string[]>("0");
  const { show, form, hideModal, submit, isEdit } = prop;

  const { showPendingTxNotif } = useNotificationContext();

  return (
    <Modal
      title="Add new policy"
      okText="Save"
      visible={show}
      confirmLoading={showPendingTxNotif}
      onCancel={() => {
        hideModal();
        form?.resetFields();
      }}
      onOk={form?.submit}
    >
      <Form
        style={{
          maxHeight: "50%",
          overflowY: "scroll",
        }}
        layout="vertical"
        form={form}
        initialValues={initialValues}
        onFinish={async (values) => {
          await submit(values);
          if (form) {
            form.resetFields();
          }
          hideModal();
        }}
      >
        <Form.Item name="id" className="d-none">
          <Input />
        </Form.Item>
        <Form.Item
          label="Operation type"
          name="opType"
          rules={[{ required: true, message: "Field is required" }]}
        >
          <Select style={{ width: "100%" }} onChange={() => {}}>
            <Select.Option key={OperationType.AND} value={OperationType.AND}>
              AND
            </Select.Option>
          </Select>
        </Form.Item>
        <div className="bg-grey-light p-10 ant-form-item">
          <Form.List name="policyConditions">
            {(fields, { add, remove }) => (
              <Space direction="vertical" className="w-100">
                {fields.map(({ key, name }) => (
                  <Collapse
                    accordion
                    key={key}
                    destroyInactivePanel
                    activeKey={activeKey}
                    onChange={(keyToSet: string | string[]) =>
                      setActiveKey(keyToSet)
                    }
                  >
                    <Panel
                      header={`Policy condition ${name}`}
                      key={`${key}${name}`}
                    >
                      <Space direction="vertical" className="w-100" key={key}>
                        <Form.Item
                          name={[name, "name"]}
                          key={`${key}-name`}
                          label="Policy condition name"
                          rules={[
                            { required: true, message: "Field is required" },
                          ]}
                        >
                          <Input disabled={isEdit} />
                        </Form.Item>
                        <Form.Item
                          label="Attribute name"
                          name={[name, "attributeName"]}
                          key={`${key}-attributeName`}
                          rules={[
                            { required: true, message: "Field is required" },
                          ]}
                        >
                          <Input disabled={isEdit} />
                        </Form.Item>
                        <Form.Item
                          label="Type of value"
                          name={[name, "typeOfValue"]}
                          key={`${key}-typeOfValue`}
                          rules={[
                            { required: true, message: "Field is required" },
                          ]}
                        >
                          <Select
                            style={{ width: "100%" }}
                            onChange={() => {}}
                            disabled={isEdit}
                          >
                            <Select.Option
                              key={TypeOfValue.TYPE_UINT256}
                              value={TypeOfValue.TYPE_UINT256}
                            >
                              TYPE_UINT256
                            </Select.Option>
                            <Select.Option
                              key={TypeOfValue.TYPE_BYTES}
                              value={TypeOfValue.TYPE_BYTES}
                            >
                              TYPE_BYTES
                            </Select.Option>
                            <Select.Option
                              key={TypeOfValue.TYPE_ADDRESS}
                              value={TypeOfValue.TYPE_ADDRESS}
                            >
                              TYPE_ADDRESS
                            </Select.Option>
                            <Select.Option
                              key={TypeOfValue.TYPE_BYTES32}
                              value={TypeOfValue.TYPE_BYTES32}
                            >
                              TYPE_BYTES32
                            </Select.Option>
                            <Select.Option
                              key={TypeOfValue.TYPE_STRING}
                              value={TypeOfValue.TYPE_STRING}
                            >
                              TYPE_STRING
                            </Select.Option>
                            <Select.Option
                              key={TypeOfValue.TYPE_BOOLEAN}
                              value={TypeOfValue.TYPE_BOOLEAN}
                            >
                              TYPE_BOOLEAN
                            </Select.Option>
                          </Select>
                        </Form.Item>
                        <Form.Item
                          label="Value"
                          name={[name, "value"]}
                          key={`${key}-value`}
                          rules={[
                            { required: true, message: "Field is required" },
                          ]}
                        >
                          <Input disabled={isEdit} />
                        </Form.Item>
                        <Form.Item
                          label="Attribute operation"
                          name={[name, "attributeOperation"]}
                          key={`${key}-attributeOperation`}
                          rules={[
                            { required: true, message: "Field is required" },
                          ]}
                        >
                          <Select
                            style={{ width: "100%" }}
                            onChange={() => {}}
                            disabled={isEdit}
                          >
                            <Select.Option
                              key={Operation.EQUAL}
                              value={Operation.EQUAL}
                            >
                              EQUAL
                            </Select.Option>
                          </Select>
                        </Form.Item>
                      </Space>
                    </Panel>
                  </Collapse>
                ))}
                <Row justify="space-between">
                  <Col>
                    <Button
                      type="dashed"
                      disabled={isEdit}
                      onClick={() => {
                        add();
                        setActiveKey(`${fields.length}`);
                      }}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add policy condition
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      type="dashed"
                      disabled={isEdit}
                      onClick={() => remove(fields.length - 1)}
                      block
                      icon={<MinusOutlined />}
                    >
                      Remove last condition
                    </Button>
                  </Col>
                </Row>
              </Space>
            )}
          </Form.List>
        </div>

        <Form.Item
          label="Policy name"
          name="policyName"
          rules={[{ required: true, message: "Field is required" }]}
        >
          <Input disabled={isEdit} />
        </Form.Item>
        <Form.Item
          label="Description"
          name="description"
          rules={[{ required: true, message: "Field is required" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
