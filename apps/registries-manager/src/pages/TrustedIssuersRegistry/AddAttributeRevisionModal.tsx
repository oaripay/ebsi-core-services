import React, { ReactElement } from "react";
import { Col, Form, Input, Modal, Row, Spin } from "antd";
import useAddRevision from "./hooks/use-add-revision";

export default function AddAttributeRevisionModal({
  showModal,
  setModal,
  did,
  attribute,
  loadTableData,
}: {
  attribute: string;
  did: string;
  showModal: boolean;
  setModal: (options: {
    show: boolean;
    did: string;
    attribute: string;
  }) => void;
  loadTableData: () => void;
}): ReactElement {
  const { submitting, submit, form, setHasFieldsErrors, hasFieldsErrors } =
    useAddRevision();

  return (
    <Modal
      title="Add revision"
      okText="Add"
      visible={showModal}
      onCancel={() => {
        setModal({
          show: false,
          did: "",
          attribute,
        });
        form.resetFields(["attribute", "revision"]);
      }}
      okButtonProps={{
        loading: submitting,
        disabled: hasFieldsErrors,
      }}
      onOk={async () => {
        await submit(did);
        setModal({
          show: false,
          did: "",
          attribute: "",
        });
        form.resetFields(["attribute", "revision"]);
        loadTableData();
      }}
    >
      <Spin spinning={submitting}>
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            attribute,
            revision: "",
          }}
        >
          <Row>
            <Col span={24}>
              <Form.Item
                label="Attribute"
                name="attribute"
                rules={[{ required: true }]}
              >
                <Input placeholder="{ <attribute>: <value>}" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item
                label="Revision"
                name="revision"
                rules={[
                  {
                    required: true,
                    message: "Revision is required!",
                  },
                  ({ getFieldValue }) => ({
                    validator() {
                      try {
                        JSON.parse(getFieldValue("revision"));
                        setHasFieldsErrors(false);
                        return Promise.resolve();
                      } catch (ex) {
                        setHasFieldsErrors(true);
                        return Promise.reject(
                          new Error("Not a valid revision format!")
                        );
                      }
                    },
                  }),
                ]}
              >
                <Input placeholder="{ <attribute>: <value>}" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Spin>
    </Modal>
  );
}
